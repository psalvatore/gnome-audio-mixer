export class LineBuffer {
  private buffer: string = "";

  push(chunk: string): string[] {
    this.buffer += chunk;

    const lines: string[] = [];
    let newline = this.buffer.indexOf("\n");
    while (newline >= 0) {
      lines.push(this.buffer.slice(0, newline));

      this.buffer = this.buffer.substring(newline + 1);
      newline = this.buffer.indexOf("\n");
    }

    return lines;
  }
}
