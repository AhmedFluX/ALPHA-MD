
const fs = require('fs');
const path = require('path');

class AlphaPluginLoader {
  constructor(options = {}) {
    this.directory = path.resolve(
      options.directory || './plugins'
    );

    this.commands = new Map();
    this.plugins = new Map();
    this.errors = [];
  }

  getFiles(directory = this.directory) {
    if (!fs.existsSync(directory)) return [];

    const files = [];

    for (const item of fs.readdirSync(directory, {
      withFileTypes: true
    })) {
      const fullPath = path.join(directory, item.name);

      if (item.isDirectory()) {
        files.push(...this.getFiles(fullPath));
      } else if (
        item.isFile() &&
        item.name.endsWith('.js') &&
        !item.name.startsWith('_')
      ) {
        files.push(fullPath);
      }
    }

    return files;
  }

  normalizeCommand(command) {
    return String(command || '')
      .trim()
      .toLowerCase();
  }

  register(plugin, file) {
    if (!plugin || typeof plugin !== 'object') {
      throw new Error('Plugin must export an object');
    }

    const command = this.normalizeCommand(plugin.command);

    if (!command) {
      throw new Error('Plugin command is missing');
    }

    if (typeof plugin.execute !== 'function') {
      throw new Error(`Execute function missing: ${command}`);
    }

    const aliases = Array.isArray(plugin.alias)
      ? plugin.alias.map(alias => this.normalizeCommand(alias))
      : [];

    const names = [...new Set([command, ...aliases])];

    for (const name of names) {
      if (!name) continue;

      const existing = this.commands.get(name);

      if (existing && existing.file !== file) {
        throw new Error(`Duplicate command: ${name}`);
      }
    }

    const data = {
      command,
      aliases,
      category: plugin.category || plugin.type || 'GENERAL',
      description: plugin.description || plugin.desc || 'No description',
      usage: plugin.usage || '',
      execute: plugin.execute,
      ownerOnly: Boolean(plugin.ownerOnly),
      groupOnly: Boolean(plugin.groupOnly),
      privateOnly: Boolean(plugin.privateOnly),
      adminOnly: Boolean(plugin.adminOnly),
      file
    };

    for (const name of names) {
      if (name) this.commands.set(name, data);
    }

    this.plugins.set(file, data);

    return data;
  }

  loadFile(file) {
    try {
      const resolved = require.resolve(file);

      delete require.cache[resolved];

      const plugin = require(resolved);
      const data = this.register(plugin, file);

      console.log(`[ALPHA PLUGIN] Loaded: ${data.command}`);

      return {
        success: true,
        command: data.command
      };
    } catch (error) {
      this.errors.push({
        file,
        message: error.message,
        time: Date.now()
      });

      console.error(
        `[ALPHA PLUGIN ERROR] ${path.basename(file)}:`,
        error.message
      );

      return {
        success: false,
        error: error.message
      };
    }
  }

  loadAll() {
    const files = this.getFiles();

    let loaded = 0;
    let failed = 0;

    for (const file of files) {
      const result = this.loadFile(file);

      if (result.success) loaded++;
      else failed++;
    }

    return {
      total: files.length,
      loaded,
      failed,
      commands: this.commands.size
    };
  }

  get(command) {
    return this.commands.get(
      this.normalizeCommand(command)
    ) || null;
  }

  has(command) {
    return this.commands.has(
      this.normalizeCommand(command)
    );
  }

  async execute(command, message, sock, args = []) {
    const plugin = this.get(command);

    if (!plugin) {
      return {
        success: false,
        reason: 'COMMAND_NOT_FOUND'
      };
    }

    try {
      const result = await plugin.execute({
        message,
        sock,
        args,
        command: plugin.command,
        plugin,
        loader: this
      });

      return {
        success: true,
        result
      };
    } catch (error) {
      console.error(
        `[ALPHA COMMAND ERROR] ${plugin.command}:`,
        error.message
      );

      return {
        success: false,
        reason: 'EXECUTION_ERROR',
        error: error.message
      };
    }
  }

  unload(file) {
    const resolved = path.resolve(file);
    const plugin = this.plugins.get(resolved);

    if (!plugin) return false;

    for (const name of [plugin.command, ...plugin.aliases]) {
      this.commands.delete(name);
    }

    this.plugins.delete(resolved);

    try {
      delete require.cache[require.resolve(resolved)];
    } catch {}

    return true;
  }

  reload(file) {
    const resolved = path.resolve(file);

    this.unload(resolved);

    if (!fs.existsSync(resolved)) {
      return {
        success: false,
        error: 'Plugin file not found'
      };
    }

    return this.loadFile(resolved);
  }

  getAll() {
    return Array.from(
      new Set(this.commands.values())
    ).map(plugin => ({
      command: plugin.command,
      aliases: plugin.aliases,
      category: plugin.category,
      description: plugin.description,
      file: plugin.file
    }));
  }

  getCategories() {
    const categories = {};

    for (const plugin of new Set(this.commands.values())) {
      const category = plugin.category;

      if (!categories[category]) {
        categories[category] = [];
      }

      categories[category].push(plugin.command);
    }

    return categories;
  }

  getStats() {
    return {
      plugins: this.plugins.size,
      commands: this.commands.size,
      errors: this.errors.length
    };
  }
}

const pluginLoader = new AlphaPluginLoader();

module.exports = {
  AlphaPluginLoader,
  pluginLoader
};
