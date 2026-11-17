import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import St from "gi://St";
import Gio from "gi://Gio";
import Clutter from "gi://Clutter";
import type { AudioState } from "../src/types.js";
import { isValidAudioMessage } from "../src/validation.js";

export default class extends Extension {
  private _indicator: PanelMenu.Button | null = null;
  private _subprocess: Gio.Subprocess | null = null;
  private _cancellable: Gio.Cancellable | null = null;
  private _state: AudioState | null = null;
  private _commandQueue: Uint8Array[] = [];
  private _isWriting = false;
  private _sessionId = 0;

  enable() {
    this._sessionId++;
    this._indicator = new PanelMenu.Button(0.0, "button", false);

    const icon = new St.Icon({ icon_name: "audio-volume-high-symbolic" });
    this._indicator.add_child(icon);

    Main.panel.addToStatusArea(this.uuid, this._indicator);

    this._cancellable = new Gio.Cancellable();
    this._startBackend();
    this._startReadingBackendOutput();
  }

  disable() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }

    this._cancellable?.cancel();
    this._cancellable = null;
    this._sessionId++;
    this._commandQueue = [];
    this._isWriting = false;
    this._subprocess?.send_signal(2);
    this._subprocess = null;
    this._state = null;
  }

  private _startBackend(): void {
    this._subprocess = Gio.Subprocess.new(
      [
        "/home/pat/.nvm/versions/node/v24.21.0/bin/node",
        "/home/pat/Development/Projects/gnome-audio-mixer/dist/ipc-server.js",
      ],
      Gio.SubprocessFlags.STDOUT_PIPE |
        Gio.SubprocessFlags.STDIN_PIPE |
        Gio.SubprocessFlags.STDERR_PIPE,
    );

    this._startReadingBackendErrors();
  }

  private _sendCommand(command: unknown): void {
    const serialized = JSON.stringify(command) + "\n";
    const encoded = new TextEncoder().encode(serialized);

    this._commandQueue.push(encoded);
    this._processCommandQueue();
  }

  private _processCommandQueue(): void {
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
          this._processCommandQueue();
        }
      }
    });
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

    this._readNextLine(dataInputStream, this._cancellable);
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

  private _readNextLine(
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
        this._handleMessage(parsed);
      } catch (error) {
        console.error("Audio IPC JSON Error:" + error);
      }

      this._readNextLine(inputStream, cancellable);
    });
  }

  private _handleMessage(message: unknown): void {
    if (isValidAudioMessage(message)) {
      switch (message.type) {
        case "state":
          this._state = message.payload;
          this._renderMenu(this._state);
          console.log("Audio IPC state updated:", JSON.stringify(message));
          break;
        default:
          break;
      }
    } else {
      console.log("Audio IPC expected audio message.");
    }
  }

  private _renderMenu(state: AudioState): void {
    if (!this._indicator) return;

    const menu = this._indicator.menu as PopupMenu.PopupMenu;

    menu.removeAll();

    const outputDevicesHeader = new PopupMenu.PopupSeparatorMenuItem(
      "Output Devices",
    );

    menu.addMenuItem(outputDevicesHeader);

    if (state.sinks.length === 0) {
      const menuItem = new PopupMenu.PopupMenuItem("No output devices found");

      menuItem.sensitive = false;
      menu.addMenuItem(menuItem);
    }

    for (const sink of state.sinks) {
      const menuItem = new PopupMenu.PopupMenuItem(sink.description);
      const volumeLabel = new St.Label({
        text: `${sink.volume}%`,
        y_align: Clutter.ActorAlign.CENTER,
      });

      menuItem.add_child(volumeLabel);
      menuItem.label.x_expand = true;
      menu.addMenuItem(menuItem);
    }

    const applicationsHeader = new PopupMenu.PopupSeparatorMenuItem(
      "Applications",
    );

    menu.addMenuItem(applicationsHeader);

    if (state.sinkInputs.length === 0) {
      const menuItem = new PopupMenu.PopupMenuItem(
        "No active application streams",
      );

      menuItem.sensitive = false;
      menu.addMenuItem(menuItem);
    }

    for (const sinkInput of state.sinkInputs) {
      const name =
        !sinkInput.applicationName.trim() ||
        sinkInput.applicationName === "Unknown Application"
          ? sinkInput.mediaName || "Unknown Application"
          : sinkInput.applicationName;
      const menuItem = new PopupMenu.PopupMenuItem(name);
      const volumeLabel = new St.Label({
        text: `${sinkInput.volume}%`,
        y_align: Clutter.ActorAlign.CENTER,
      });

      menuItem.add_child(volumeLabel);
      menuItem.label.x_expand = true;
      menu.addMenuItem(menuItem);
    }
  }
}
