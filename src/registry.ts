import {ImageFilterFactory} from './filter.js';

class FilterRegistry {
  private readonly factories = new Map<string, ImageFilterFactory>();

  register(factory: ImageFilterFactory): void {
    const name = factory.name();
    if (this.factories.has(name)) {
      throw new Error(`Filter with name "${name}" is already registered.`);
    }
    console.log(`Register: ${name}`);
    this.factories.set(name, factory);
  }

  get(name: string): ImageFilterFactory|undefined {
    return this.factories.get(name);
  }

  getAllNames(): string[] {
    return Array.from(this.factories.keys());
  }

  getAll(): ImageFilterFactory[] {
    return Array.from(this.factories.values());
  }
}

export const filterRegistry = new FilterRegistry();
