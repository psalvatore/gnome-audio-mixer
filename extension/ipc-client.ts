import Gio from "gi://Gio";
import GLib from "gi://GLib";

export class AudioIpcClient {
  private _sessionId = 0;
  private _subprocess: Gio.Subprocess | null = null;
  private _cancellable: Gio.Cancellable | null = null;
  private _commandQueue: Uint8Array[] = [];
  private _isWriting = false;
  private _restartSourceId: number | null = null;
  private _consecutiveRestarts: number = 0;
  private _healthSourceId: number | null = null;

  constructor(
    private readonly extensionPath: string,
    private readonly onMessage: (message: unknown) => void,
  ) {}

  startBackend(): void {
    if (this._subprocess !== null) return;

    try {
      this._launchBackend();
      this._startMonitoring();
      this._startHealthTimer();
    } catch (error) {
      this.cleanupBackend();
      this._handleStartupFailure(error);
    }
  }

  readNextLine(
    inputStream: Gio.DataInputStream,
    cancellable: Gio.Cancellable,
  ): void {
    inputStream.read_line_async(0, cancellable, (stream, result) => {
      let line: string | null;

      try {
        [line] = inputStream.read_line_finish_utf8(result);
      } catch (error) {
        if (!cancellable.is_cancelled()) {
          console.error("Audio IPC read error:", error);
        }
        return;
      }

      if (line === null || cancellable.is_cancelled()) {
        return;
      }

      try {
        const parsed = JSON.parse(line);
        this.onMessage(parsed);
      } catch (error) {
        console.error("Audio IPC JSON Error:" + error);
      }

      this.readNextLine(inputStream, cancellable);
    });
  }

  processCommandQueue(): void {
    if (this._isWriting || this._commandQueue.length === 0) {
      return;
    }

    const outputStream = this._subprocess?.get_stdin_pipe();

    if (!outputStream) {
      console.error("Audio IPC: stdin pipe unavailable");
      return;
    }

    const sessionId = this._sessionId;
    const cancellable = this._cancellable;
    const command = this._commandQueue.shift()!;

    this._isWriting = true;

    outputStream.write_all_async(command, 0, cancellable, (stream, result) => {
      try {
        stream?.write_all_finish(result);
        console.log("Audio IPC command written");
      } catch (error) {
        if (!cancellable?.is_cancelled()) {
          console.error("Audio IPC write error:", error);
        }
      } finally {
        if (sessionId !== this._sessionId) return;

        this._isWriting = false;

        if (!cancellable?.is_cancelled()) {
          this.processCommandQueue();
        }
      }
    });
  }

  sendCommand(command: unknown): void {
    const serialized = JSON.stringify(command) + "\n";
    const encoded = new TextEncoder().encode(serialized);

    this._commandQueue.push(encoded);
    this.processCommandQueue();
  }

  cleanupBackend(): void {
    this._sessionId++;
    this._cancellable?.cancel();
    this._cancellable = null;
    this._commandQueue = [];
    this._isWriting = false;
    this._subprocess?.send_signal(2);
    this._subprocess = null;

    if (this._restartSourceId !== null) {
      GLib.Source.remove(this._restartSourceId);
      this._restartSourceId = null;
    }

    if (this._healthSourceId !== null) {
      GLib.Source.remove(this._healthSourceId);
      this._healthSourceId = null;
    }
  }

  private _launchBackend(): void {
    this._sessionId++;

    const nodePath = GLib.find_program_in_path("node");

    if (!nodePath) {
      throw new Error("Node.js executable not found in PATH");
    }

    const backendPath = GLib.build_filenamev([
      this.extensionPath,
      "backend",
      "ipc-server.js",
    ]);

    this._subprocess = Gio.Subprocess.new(
      [nodePath, backendPath],
      Gio.SubprocessFlags.STDOUT_PIPE |
        Gio.SubprocessFlags.STDIN_PIPE |
        Gio.SubprocessFlags.STDERR_PIPE,
    );

    this._cancellable = new Gio.Cancellable();

    this._startReadingBackendErrors();
    this._startReadingBackendOutput();
  }

  private _startMonitoring(): void {
    const subprocess = this._subprocess;
    const sessionId = this._sessionId;

    if (subprocess) {
      subprocess.wait_async(null, (_source, result) => {
        try {
          subprocess.wait_finish(result);
        } catch (error) {
          if (sessionId === this._sessionId) {
            console.error("Failed to wait for audio backend:", error);
          }
          return;
        }

        // Ignore termination events from a stopped or previous session.
        if (sessionId !== this._sessionId) return;

        // Prevent edge case where crash and restart timing circumvent exponential backoff
        if (this._healthSourceId !== null) {
          GLib.Source.remove(this._healthSourceId);
          this._healthSourceId = null;
        }

        if (subprocess.get_if_exited()) {
          console.error(
            `Audio backend exited unexpectedly (code: ${subprocess.get_exit_status()})`,
          );
        } else if (subprocess.get_if_signaled()) {
          console.error(
            `Audio backend terminated by signal ${subprocess.get_term_sig()}`,
          );
        }

        if (this._consecutiveRestarts >= 5) {
          console.error("Too many failed consecutive restart attempts");
          return;
        }

        this._scheduleRestart();
      });
    }
  }

  private _handleStartupFailure(error: unknown): void {
    console.error("Audio Backend failed to launch:", error);

    if (this._consecutiveRestarts >= 5) {
      console.error(
        "Too many failed consecutive restart attempts. Manually disable and re-enable extension to try again.",
      );
      return;
    }

    this._scheduleRestart();
  }

  private _startReadingBackendErrors(): void {
    const cancellable = this._cancellable;
    const stderr = this._subprocess?.get_stderr_pipe();

    if (stderr) {
      const errorStream = new Gio.DataInputStream({ base_stream: stderr });

      const readStderrLine = () => {
        errorStream.read_line_async(0, cancellable, (stream, result) => {
          try {
            const [line] = errorStream.read_line_finish_utf8(result);

            if (line === null) return;

            console.log("Node stderr:", line);

            if (!cancellable?.is_cancelled()) {
              readStderrLine();
            }
          } catch (error) {
            if (!cancellable?.is_cancelled()) {
              console.error("Node stderr read error:", error);
            }
          }
        });
      };

      readStderrLine();
    }
  }

  private _startReadingBackendOutput(): void {
    const inputStream = this._subprocess?.get_stdout_pipe();

    if (!(inputStream instanceof Gio.InputStream)) {
      throw new Error("Expected an input stream");
    }

    const dataInputStream = Gio.DataInputStream.new(inputStream);

    if (!(this._cancellable instanceof Gio.Cancellable)) {
      throw new Error("Expected a cancellable");
    }

    this.readNextLine(dataInputStream, this._cancellable);
  }

  private _scheduleRestart(): void {
    if (this._restartSourceId !== null) return;

    this._consecutiveRestarts++;

    const sessionId = this._sessionId;
    const timeout = 1000 * 2 ** (this._consecutiveRestarts - 1);

    this._restartSourceId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      timeout,
      () => {
        this._restartSourceId = null;

        if (sessionId !== this._sessionId) {
          return GLib.SOURCE_REMOVE;
        }

        this.cleanupBackend();
        this.startBackend();

        return GLib.SOURCE_REMOVE;
      },
    );
  }

  private _startHealthTimer(): void {
    if (this._healthSourceId !== null) return;

    const sessionId = this._sessionId;

    this._healthSourceId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      30000,
      () => {
        this._healthSourceId = null;

        if (sessionId !== this._sessionId) {
          return GLib.SOURCE_REMOVE;
        }

        this._consecutiveRestarts = 0;

        return GLib.SOURCE_REMOVE;
      },
    );
  }
}
