export class PassThrough {
  destroyed = false;

  pipe() {
    return this;
  }

  on() {
    return this;
  }

  once() {
    return this;
  }

  destroy() {
    this.destroyed = true;
  }
}

export class Readable {
  static fromWeb<T>(stream: T): T {
    return stream;
  }

  static toWeb<T>(stream: T): T {
    return stream;
  }
}
