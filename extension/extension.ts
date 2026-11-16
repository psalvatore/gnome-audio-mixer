import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import St from "gi://St";
import Gio from "gi://Gio";
import Clutter from "gi://Clutter";
import type { AudioMessage, AudioState } from "../src/types.js";
import { isValidAudioMessage } from "../src/validation.js";

export default class extends Extension {
  private _indicator: PanelMenu.Button | null = null;
  private _subprocess: Gio.Subprocess | null = null;
  private _cancellable: Gio.Cancellable | null = null;
  private _state: AudioState | null = null;

  enable() {
    this._indicator = new PanelMenu.Button(0.0, "button", false);

    const icon = new St.Icon({ icon_name: "audio-volume-high-symbolic" });
    this._indicator.add_child(icon);

    Main.panel.addToStatusArea(this.uuid, this._indicator);

    this._startBackend();

    this._cancellable = new Gio.Cancellable();

    this._startReadingBackendOutput();
  }

  disable() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }

    this._cancellable?.cancel();
    this._cancellable = null;

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
      Gio.SubprocessFlags.STDOUT_PIPE,
    );
  }

  private _startReadingBackendOutput(): void {
    const stream = this._subprocess?.get_stdout_pipe();

    if (!(stream instanceof Gio.InputStream)) {
      throw new Error("Expected an input stream");
    }

    const dataInputStream = Gio.DataInputStream.new(stream);

    if (!(this._cancellable instanceof Gio.Cancellable)) {
      throw new Error("Expected a cancellable");
    }

    this._readNextLine(dataInputStream, this._cancellable);
  }

  private _readNextLine(
    inputStream: Gio.DataInputStream,
    cancellable: Gio.Cancellable,
  ): void {
    inputStream.read_line_async(0, cancellable, (_stream, result) => {
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

    if (state.sinks.length === 0) {
      const menuItem = new PopupMenu.PopupMenuItem("No output devices found");

      menuItem.sensitive = false;
      menu.addMenuItem(menuItem);

      return;
    }

    const sectionHeader = new PopupMenu.PopupSeparatorMenuItem(
      "Output Devices",
    );

    menu.addMenuItem(sectionHeader);

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
  }
}
