import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import St from "gi://St";
import { AudioIpcClient } from "./ipc-client.js";
import { AudioMenu } from "./audio-menu.js";
import { isValidAudioMessage } from "../src/validation.js";
import { getSinkChanges, getSinkInputChanges } from "../src/audio-diff.js";
import { AudioState } from "../src/types.js";

export default class extends Extension {
  private _indicator: PanelMenu.Button | null = null;
  private _ipc: AudioIpcClient | null = null;
  private _audioMenu: AudioMenu | null = null;
  private _state: AudioState | null = null;

  enable() {
    const icon = new St.Icon({ icon_name: "audio-volume-high-symbolic" });

    this._indicator = new PanelMenu.Button(0.0, "button", false);
    this._indicator.add_child(icon);
    Main.panel.addToStatusArea(this.uuid, this._indicator);

    this._ipc = new AudioIpcClient(this.path, (message) => {
      this._handleMessage(message);
    });

    this._audioMenu = new AudioMenu(
      this._indicator.menu as PopupMenu.PopupMenu,
      (command) => this._ipc?.sendCommand(command),
      () => this._state,
    );

    this._ipc.startBackend();
  }

  disable() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }

    if (this._ipc) {
      this._ipc.cleanupBackend();
      this._ipc = null;
    }

    if (this._audioMenu) {
      this._audioMenu.cleanupMenu();
      this._audioMenu = null;
    }

    this._state = null;
  }

  private _handleMessage(message: unknown): void {
    if (isValidAudioMessage(message)) {
      switch (message.type) {
        case "state":
          if (!this._state) {
            this._state = message.payload;
            this._audioMenu?.initMenu(this._state);

            console.log("GNOME Audio Mixer: initialized menu.");
          } else {
            const sinkChanges = getSinkChanges(
              this._state.sinks,
              message.payload.sinks,
            );

            if (sinkChanges.updated.length > 0) {
              for (const updatedSink of sinkChanges.updated) {
                this._audioMenu?.renderMenuItem(updatedSink);

                console.log(
                  `GNOME Audio Mixer: updated sink ${updatedSink.index}`,
                );
              }
            }

            if (sinkChanges.added.length > 0) {
              for (const addedSink of sinkChanges.added) {
                this._audioMenu?.renderMenuItem(addedSink);

                console.log(`GNOME Audio Mixer: added sink ${addedSink.index}`);
              }
            }

            if (sinkChanges.removed.length > 0) {
              for (const removedSink of sinkChanges.removed) {
                this._audioMenu?.destroyMenuItem(removedSink);

                console.log(
                  `GNOME Audio Mixer: removed sink ${removedSink.index}`,
                );
              }
            }

            const sinkInputChanges = getSinkInputChanges(
              this._state.sinkInputs,
              message.payload.sinkInputs,
            );

            if (sinkInputChanges.updated.length > 0) {
              for (const updatedSinkInput of sinkInputChanges.updated) {
                this._audioMenu?.renderMenuItem(updatedSinkInput);

                console.log(
                  `GNOME Audio Mixer: updated sink ${updatedSinkInput.index}`,
                );
              }
            }

            if (sinkInputChanges.added.length > 0) {
              for (const addedSinkInput of sinkInputChanges.added) {
                this._audioMenu?.renderMenuItem(addedSinkInput);

                console.log(
                  `GNOME Audio Mixer: added sink ${addedSinkInput.index}`,
                );
              }
            }

            if (sinkInputChanges.removed.length > 0) {
              for (const removedSinkInput of sinkInputChanges.removed) {
                this._audioMenu?.destroyMenuItem(removedSinkInput);

                console.log(
                  `GNOME Audio Mixer: removed sink ${removedSinkInput.index}`,
                );
              }
            }

            this._state = message.payload;
            this._audioMenu?.updateEmptyStates(this._state);
          }

          break;
      }
    } else {
      console.log("Audio IPC expected audio message.");
    }
  }
}
