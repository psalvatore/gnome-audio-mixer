import Gio from "gi://Gio";

export class AudioIpcClient {
  private _sessionId = 0;
  private _subprocess: Gio.Subprocess | null = null;
  private _cancellable: Gio.Cancellable | null = null;
  private _commandQueue: Uint8Array[] = [];
  private _isWriting = false;

  constructor(private readonly onMessage: (message: unknown) => void) {}

  startBackend(): void {
    this._sessionId++;
    this._subprocess = Gio.Subprocess.new(
      [
        "/home/pat/.nvm/versions/node/v24.21.0/bin/node",
        "/home/pat/Development/Projects/gnome-audio-mixer/dist/ipc-server.js",
      ],
      Gio.SubprocessFlags.STDOUT_PIPE |
        Gio.SubprocessFlags.STDIN_PIPE |
        Gio.SubprocessFlags.STDERR_PIPE,
    );
    this._cancellable = new Gio.Cancellable();

    this.startReadingBackendErrors();
    this.startReadingBackendOutput();
  }

  cleanupBackend(): void {
    this._sessionId++;
    this._cancellable?.cancel();
    this._cancellable = null;
    this._commandQueue = [];
    this._isWriting = false;
    this._subprocess?.send_signal(2);
    this._subprocess = null;
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

  startReadingBackendErrors(): void {
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

  startReadingBackendOutput(): void {
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
}
