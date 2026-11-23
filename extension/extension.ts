import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as Slider from "resource:///org/gnome/shell/ui/slider.js";
import St from "gi://St";
import Gio from "gi://Gio";
import Clutter from "gi://Clutter";
import type { AudioSink, AudioSinkInput, AudioState } from "../src/types.js";
import {
  isValidAudioMessage,
  isAudioSink,
  isAudioSinkInput,
} from "../src/validation.js";
import { getSinkChanges, getSinkInputChanges } from "../src/audio-diff.js";
import { VOLUME_LIMIT } from "../src/config.js";

type AudioMenuItem = {
  menuItem: PopupMenu.PopupBaseMenuItem;
  slider: Slider.Slider;
  muteIcon: St.Icon;
  sliderHandlerId: number;
};

export default class extends Extension {
  private _indicator: PanelMenu.Button | null = null;
  private _subprocess: Gio.Subprocess | null = null;
  private _cancellable: Gio.Cancellable | null = null;
  private _state: AudioState | null = null;
  private _commandQueue: Uint8Array[] = [];
  private _isWriting = false;
  private _sessionId = 0;
  private _audioMenuItems = new Map<string, AudioMenuItem>();
  private _outputDevicesSection: PopupMenu.PopupMenuSection | null = null;
  private _applicationsSection: PopupMenu.PopupMenuSection | null = null;
  private _noDevicesItem: PopupMenu.PopupMenuItem | null = null;
  private _noApplicationsItem: PopupMenu.PopupMenuItem | null = null;

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
    this._audioMenuItems.clear();
    this._outputDevicesSection = null;
    this._applicationsSection = null;
    this._noDevicesItem = null;
    this._noApplicationsItem = null;
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
          if (!this._state) {
            this._state = message.payload;
            this._initMenu(this._state);

            console.log("GNOME Audio Mixer: initialized menu.");
          } else {
            const sinkChanges = getSinkChanges(
              this._state.sinks,
              message.payload.sinks,
            );

            if (sinkChanges.updated.length > 0) {
              for (const updatedSink of sinkChanges.updated) {
                this._renderMenuItem(updatedSink);

                console.log(
                  `GNOME Audio Mixer: updated sink ${updatedSink.index}`,
                );
              }
            }

            if (sinkChanges.added.length > 0) {
              for (const addedSink of sinkChanges.added) {
                this._renderMenuItem(addedSink);

                console.log(`GNOME Audio Mixer: added sink ${addedSink.index}`);
              }
            }

            if (sinkChanges.removed.length > 0) {
              for (const removedSink of sinkChanges.removed) {
                this._destroyMenuItem(removedSink);

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
                this._renderMenuItem(updatedSinkInput);

                console.log(
                  `GNOME Audio Mixer: updated sink ${updatedSinkInput.index}`,
                );
              }
            }

            if (sinkInputChanges.added.length > 0) {
              for (const addedSinkInput of sinkInputChanges.added) {
                this._renderMenuItem(addedSinkInput);

                console.log(
                  `GNOME Audio Mixer: added sink ${addedSinkInput.index}`,
                );
              }
            }

            if (sinkInputChanges.removed.length > 0) {
              for (const removedSinkInput of sinkInputChanges.removed) {
                this._destroyMenuItem(removedSinkInput);

                console.log(
                  `GNOME Audio Mixer: removed sink ${removedSinkInput.index}`,
                );
              }
            }

            this._state = message.payload;
            this._updateEmptyStates(this._state);
          }

          break;
        default:
          break;
      }
    } else {
      console.log("Audio IPC expected audio message.");
    }
  }

  private _renderMenuItem(audioStream: AudioSink | AudioSinkInput): void {
    const mapKey = this._getMapKey(audioStream);

    if (this._audioMenuItems.get(mapKey) === undefined) {
      this._initMenuItem(audioStream);
    } else {
      this._updateMenuItem(audioStream);
    }
  }

  private _initMenu(state: AudioState): void {
    if (!this._indicator) return;

    const menu = this._indicator.menu as PopupMenu.PopupMenu;

    // Output Devices
    const outputDevicesHeader = new PopupMenu.PopupSeparatorMenuItem(
      "Output Devices",
    );

    this._outputDevicesSection = new PopupMenu.PopupMenuSection();
    this._outputDevicesSection.addMenuItem(outputDevicesHeader);
    this._noDevicesItem = new PopupMenu.PopupMenuItem(
      "No output devices found",
    );
    this._noDevicesItem.sensitive = false;
    this._outputDevicesSection.addMenuItem(this._noDevicesItem);

    menu.addMenuItem(this._outputDevicesSection);

    for (const sink of state.sinks) {
      this._renderMenuItem(sink);
    }

    // Applications
    const applicationsHeader = new PopupMenu.PopupSeparatorMenuItem(
      "Applications",
    );

    this._applicationsSection = new PopupMenu.PopupMenuSection();
    this._applicationsSection.addMenuItem(applicationsHeader);
    this._noApplicationsItem = new PopupMenu.PopupMenuItem(
      "No active application streams",
    );
    this._noApplicationsItem.sensitive = false;
    this._applicationsSection.addMenuItem(this._noApplicationsItem);

    menu.addMenuItem(this._applicationsSection);

    for (const sinkInput of state.sinkInputs) {
      this._renderMenuItem(sinkInput);
    }

    this._updateEmptyStates(state);
  }

  private _initMenuItem(audioStream: AudioSink | AudioSinkInput): void {
    const menuItem = new PopupMenu.PopupBaseMenuItem({
      activate: false,
      can_focus: false,
    });
    const container = new St.BoxLayout({
      vertical: true,
      x_expand: true,
    });
    const topRow = new St.BoxLayout({
      x_expand: true,
    });
    const itemLabel = new St.Label({ text: "", x_expand: true });
    const slider = new Slider.Slider(audioStream.volume / VOLUME_LIMIT);
    const muteButton = new St.Button({
      child: new St.Icon({
        icon_name: "audio-volume-high-symbolic",
        style_class: "popup-menu-icon",
        x_align: 2,
        icon_size: 20,
      }),
    });
    const muteIcon = muteButton.get_child() as St.Icon;

    let audioStreamName = "";
    let volumeCommand = "";
    let muteCommand = "";
    let sinkType = "";

    if (isAudioSink(audioStream)) {
      audioStreamName = audioStream.description;
      volumeCommand = "set-sink-volume";
      muteCommand = "set-sink-mute";
      sinkType = "sink";
    }

    if (isAudioSinkInput(audioStream)) {
      audioStreamName =
        !audioStream.applicationName.trim() ||
        audioStream.applicationName === "Unknown Application"
          ? audioStream.mediaName || "Unknown Application"
          : audioStream.applicationName;
      volumeCommand = "set-sink-input-volume";
      muteCommand = "set-sink-input-mute";
      sinkType = "sinkInput";
    }

    const sliderHandlerId = slider.connect("notify::value", () => {
      console.log("slider value changed");

      this._sendCommand({
        type: volumeCommand,
        sinkIndex: audioStream.index,
        volume: Math.round(slider.value * VOLUME_LIMIT),
      });
    });

    muteIcon.icon_name = audioStream.mute
      ? "audio-volume-muted-symbolic"
      : "audio-volume-high-symbolic";

    muteButton.connect("clicked", () => {
      console.log("mute button clicked");

      const currentStream = this._getCurrentAudioStreamById(
        sinkType,
        audioStream.index,
      );

      if (!currentStream) return;

      this._sendCommand({
        type: muteCommand,
        sinkIndex: currentStream.index,
        muted: !currentStream.mute,
      });
    });

    itemLabel.set_text(audioStreamName);
    topRow.add_child(itemLabel);
    topRow.add_child(muteButton);
    container.add_child(topRow);
    container.add_child(slider);
    menuItem.add_child(container);

    if (sinkType === "sink" && this._outputDevicesSection) {
      this._outputDevicesSection.addMenuItem(menuItem);
    }

    if (sinkType === "sinkInput" && this._applicationsSection) {
      this._applicationsSection.addMenuItem(menuItem);
    }

    const mapKey = this._getMapKey(audioStream);
    this._audioMenuItems.set(mapKey, {
      menuItem,
      slider,
      muteIcon,
      sliderHandlerId,
    });
  }

  private _updateMenuItem(audioStream: AudioSink | AudioSinkInput): void {
    const mapKey = this._getMapKey(audioStream);
    const audioMenuItem = this._audioMenuItems.get(mapKey);

    if (!audioMenuItem) return;

    audioMenuItem.slider.block_signal_handler(audioMenuItem.sliderHandlerId);

    try {
      audioMenuItem.slider.value = audioStream.volume / VOLUME_LIMIT;
    } finally {
      audioMenuItem.slider.unblock_signal_handler(
        audioMenuItem.sliderHandlerId,
      );
    }

    audioMenuItem.muteIcon.icon_name = audioStream.mute
      ? "audio-volume-muted-symbolic"
      : "audio-volume-high-symbolic";
  }

  private _destroyMenuItem(audioStream: AudioSink | AudioSinkInput): void {
    const mapKey = this._getMapKey(audioStream);
    const audioMenuItem = this._audioMenuItems.get(mapKey);

    if (!audioMenuItem) return;

    audioMenuItem.menuItem.destroy();
    this._audioMenuItems.delete(mapKey);
  }

  private _getCurrentAudioStreamById(
    sinkType: string,
    index: number,
  ): AudioSink | AudioSinkInput | null {
    let audioStream = null;

    if (this._state) {
      switch (sinkType) {
        case "sink":
          audioStream = this._state.sinks.find((sink) => sink.index === index);
          break;
        case "sinkInput":
          audioStream = this._state.sinkInputs.find(
            (sinkInput) => sinkInput.index === index,
          );
          break;
      }
    }

    return audioStream ?? null;
  }

  private _getMapKey(audioStream: AudioSink | AudioSinkInput): string {
    return isAudioSink(audioStream)
      ? `sink-${audioStream.index}`
      : `sink-input-${audioStream.index}`;
  }

  private _updateEmptyStates(state: AudioState): void {
    if (this._noDevicesItem) {
      this._noDevicesItem.visible = state.sinks.length === 0;
    }

    if (this._noApplicationsItem) {
      this._noApplicationsItem.visible = state.sinkInputs.length === 0;
    }
  }
}
