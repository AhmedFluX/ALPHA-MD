
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AlphaBackup {
  constructor(options = {}) {
    this.source = path.resolve(
      options.source || './database'
    );

    this.backupDir = path.resolve(
      options.backupDir || './backups'
    );

    this.maxBackups = options.maxBackups || 20;
    this.busy = false;
  }

  async initialize() {
    await fs.promises.mkdir(this.backupDir, {
      recursive: true
    });

    return true;
  }

  async getFiles(directory, base = directory) {
    const results = [];

    if (!fs.existsSync(directory)) return results;

    const entries = await fs.promises.readdir(directory, {
      withFileTypes: true
    });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isSymbolicLink()) continue;

      if (entry.isDirectory()) {
        results.push(...await this.getFiles(fullPath, base));
      } else if (entry.isFile()) {
        results.push({
          fullPath,
          relativePath: path.relative(base, fullPath)
        });
      }
    }

    return results;
  }

  async create() {
    if (this.busy) {
      throw new Error('A backup operation is already running');
    }

    this.busy = true;

    try {
      await this.initialize();

      if (!fs.existsSync(this.source)) {
        throw new Error('Database directory not found');
      }

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-');

      const id = crypto.randomUUID().slice(0, 8);
      const backupName = `alpha-${timestamp}-${id}`;
      const destination = path.join(
        this.backupDir,
        backupName
      );

      await fs.promises.mkdir(destination, {
        recursive: true
      });

      const files = await this.getFiles(this.source);
      let totalSize = 0;

      for (const file of files) {
        const target = path.join(
          destination,
          file.relativePath
        );

        await fs.promises.mkdir(path.dirname(target), {
          recursive: true
        });

        await fs.promises.copyFile(
          file.fullPath,
          target
        );

        const stat = await fs.promises.stat(target);
        totalSize += stat.size;
      }

      const manifest = {
        name: backupName,
        createdAt: new Date().toISOString(),
        files: files.length,
        size: totalSize
      };

      await fs.promises.writeFile(
        path.join(destination, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      await this.cleanup();

      return {
        success: true,
        ...manifest
      };
    } catch (error) {
      throw new Error(`Backup failed: ${error.message}`);
    } finally {
      this.busy = false;
    }
  }

  async list() {
    await this.initialize();

    const entries = await fs.promises.readdir(
      this.backupDir,
      { withFileTypes: true }
    );

    const backups = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) {
        continue;
      }

      const folder = path.join(this.backupDir, entry.name);
      const manifestPath = path.join(folder, 'manifest.json');

      try {
        const manifest = JSON.parse(
          await fs.promises.readFile(manifestPath, 'utf8')
        );

        backups.push(manifest);
      } catch {
        continue;
      }
    }

    return backups.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  async restore(name) {
    if (this.busy) {
      throw new Error('A backup operation is already running');
    }

    if (
      typeof name !== 'string' ||
      !/^alpha-[a-zA-Z0-9-]+$/.test(name)
    ) {
      throw new Error('Invalid backup name');
    }

    this.busy = true;

    try {
      const backupPath = path.join(this.backupDir, name);
      const manifestPath = path.join(backupPath, 'manifest.json');

      const realBackup = await fs.promises.realpath(backupPath);
      const realRoot = await fs.promises.realpath(this.backupDir);

      if (
        realBackup === realRoot ||
        !realBackup.startsWith(realRoot + path.sep)
      ) {
        throw new Error('Invalid backup location');
      }

      const manifest = JSON.parse(
        await fs.promises.readFile(manifestPath, 'utf8')
      );

      if (manifest.name !== name) {
        throw new Error('Backup manifest mismatch');
      }

      const files = await this.getFiles(backupPath);
      const restoreFiles = files.filter(
        file => file.relativePath !== 'manifest.json'
      );

      const staging = `${this.source}.restore-${crypto.randomUUID()}`;

      await fs.promises.mkdir(staging, {
        recursive: true
      });

      for (const file of restoreFiles) {
        const target = path.join(
          staging,
          file.relativePath
        );

        await fs.promises.mkdir(path.dirname(target), {
          recursive: true
        });

        await fs.promises.copyFile(file.fullPath, target);
      }

      const previous = `${this.source}.previous-${crypto.randomUUID()}`;
      let movedCurrent = false;

      try {
        if (fs.existsSync(this.source)) {
          await fs.promises.rename(this.source, previous);
          movedCurrent = true;
        }

        await fs.promises.rename(staging, this.source);
      } catch (error) {
        if (movedCurrent && !fs.existsSync(this.source)) {
          await fs.promises.rename(previous, this.source);
        }

        throw error;
      }

      return {
        success: true,
        restored: name,
        previousDatabase: movedCurrent ? previous : null,
        message: 'Backup restored. Restart the bot after verifying the database.'
      };
    } catch (error) {
      throw new Error(`Restore failed: ${error.message}`);
    } finally {
      this.busy = false;
    }
  }

  async cleanup() {
    const backups = await this.list();

    const expired = backups.slice(this.maxBackups);

    for (const backup of expired) {
      const folder = path.join(this.backupDir, backup.name);

      await fs.promises.rm(folder, {
        recursive: true,
        force: true
      });
    }

    return expired.length;
  }

  async remove(name) {
    if (
      typeof name !== 'string' ||
      !/^alpha-[a-zA-Z0-9-]+$/.test(name)
    ) {
      throw new Error('Invalid backup name');
    }

    const folder = path.join(this.backupDir, name);
    const realFolder = await fs.promises.realpath(folder);
    const realRoot = await fs.promises.realpath(this.backupDir);

    if (!realFolder.startsWith(realRoot + path.sep)) {
      throw new Error('Invalid backup location');
    }

    await fs.promises.rm(folder, {
      recursive: true,
      force: true
    });

    return true;
  }
}

const backup = new AlphaBackup();

module.exports = {
  AlphaBackup,
  backup
};
