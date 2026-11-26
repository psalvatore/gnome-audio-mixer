import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Slider from "resource:///org/gnome/shell/ui/slider.js";
import St from "gi://St";
import { AudioSink, AudioSinkInput, AudioState } from "../src/types";
import { VOLUME_LIMIT } from "../src/config.js";
import { isAudioSink, isAudioSinkInput } from "../src/validation.js";

type AudioMenuItem = {
  menuItem: PopupMenu.PopupMenuSection;
  slider: Slider.Slider;
  muteIcon: St.Icon;
  sliderHandlerId: number;
};

export class AudioMenu {
  private _audioMenuItems = new Map<string, AudioMenuItem>();
  private _outputDevicesSection: PopupMenu.PopupMenuSection | null = null;
  private _applicationsSection: PopupMenu.PopupMenuSection | null = null;
  private _noDevicesItem: PopupMenu.PopupMenuItem | null = null;
  private _noApplicationsItem: PopupMenu.PopupMenuItem | null = null;

  constructor(
    private readonly menu: PopupMenu.PopupMenu,
    private readonly sendCommand: (command: unknown) => void,
    private readonly getState: () => AudioState | null,
  ) {}

  renderMenuItem(audioStream: AudioSink | AudioSinkInput): void {
    const mapKey = this.getMapKey(audioStream);

    if (this._audioMenuItems.get(mapKey) === undefined) {
      this.initMenuItem(audioStream);
    } else {
      this.updateMenuItem(audioStream);
    }
  }

  initMenu(state: AudioState): void {
    const menu = this.menu;

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
      this.renderMenuItem(sink);
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
      this.renderMenuItem(sinkInput);
    }

    this.updateEmptyStates(state);
  }

  initMenuItem(audioStream: AudioSink | AudioSinkInput): void {
    const menuItem = new PopupMenu.PopupMenuSection();
    const container = new St.BoxLayout({
      vertical: true,
      x_expand: true,
      style: "padding: 6px 12px;",
    });
    const topRow = new St.BoxLayout({
      x_expand: true,
      style: "padding: 0px 0px 5px 0px;",
    });
    const bottomRow = new St.BoxLayout({
      x_expand: true,
    });
    const itemLabel = new St.Label({ text: "", x_expand: true });
    const slider = new Slider.Slider(audioStream.volume / VOLUME_LIMIT);
    const muteButton = new St.Button({
      child: new St.Icon({
        icon_name: "audio-volume-high-symbolic",
        style_class: "popup-menu-icon",
        x_align: 1,
        icon_size: 15,
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

      this.sendCommand({
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

      const currentStream = this.getCurrentAudioStreamById(
        sinkType,
        audioStream.index,
      );

      if (!currentStream) return;

      this.sendCommand({
        type: muteCommand,
        sinkIndex: currentStream.index,
        muted: !currentStream.mute,
      });
    });

    itemLabel.set_text(audioStreamName);
    topRow.add_child(itemLabel);
    bottomRow.add_child(muteButton);
    bottomRow.add_child(new St.Widget({ width: 12 }));
    bottomRow.add_child(slider);
    container.add_child(topRow);
    container.add_child(bottomRow);
    menuItem.box.add_child(container);

    if (sinkType === "sink" && this._outputDevicesSection) {
      this._outputDevicesSection.addMenuItem(menuItem);
    }

    if (sinkType === "sinkInput" && this._applicationsSection) {
      this._applicationsSection.addMenuItem(menuItem);
    }

    const mapKey = this.getMapKey(audioStream);
    this._audioMenuItems.set(mapKey, {
      menuItem,
      slider,
      muteIcon,
      sliderHandlerId,
    });
  }

  updateMenuItem(audioStream: AudioSink | AudioSinkInput): void {
    const mapKey = this.getMapKey(audioStream);
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

  destroyMenuItem(audioStream: AudioSink | AudioSinkInput): void {
    const mapKey = this.getMapKey(audioStream);
    const audioMenuItem = this._audioMenuItems.get(mapKey);

    if (!audioMenuItem) return;

    audioMenuItem.menuItem.destroy();
    this._audioMenuItems.delete(mapKey);
  }

  updateEmptyStates(state: AudioState): void {
    if (this._noDevicesItem) {
      this._noDevicesItem.visible = state.sinks.length === 0;
    }

    if (this._noApplicationsItem) {
      this._noApplicationsItem.visible = state.sinkInputs.length === 0;
    }
  }

  getMapKey(audioStream: AudioSink | AudioSinkInput): string {
    return isAudioSink(audioStream)
      ? `sink-${audioStream.index}`
      : `sink-input-${audioStream.index}`;
  }

  getCurrentAudioStreamById(
    sinkType: string,
    index: number,
  ): AudioSink | AudioSinkInput | null {
    const state = this.getState();
    let audioStream = null;

    if (state) {
      switch (sinkType) {
        case "sink":
          audioStream = state.sinks.find((sink) => sink.index === index);
          break;
        case "sinkInput":
          audioStream = state.sinkInputs.find(
            (sinkInput) => sinkInput.index === index,
          );
          break;
      }
    }

    return audioStream ?? null;
  }

  cleanupMenu(): void {
    this._audioMenuItems.clear();
    this._outputDevicesSection = null;
    this._applicationsSection = null;
    this._noDevicesItem = null;
    this._noApplicationsItem = null;
  }
}
