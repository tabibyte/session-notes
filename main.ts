import { Plugin, TFile} from 'obsidian';

export default class SNote extends Plugin {
  private sessionNotes: TFile[] = [];
  private tempNote?: TFile;

  async onload() {
    this.addCommand({
      id: 'open-temp-note',
      name: 'Open a temporary note (delete on change)',
      callback: () => this.openTempNote(),
    });

    this.addCommand({
      id: 'open-session-note',
      name: 'Open a session note (delete on app close)',
      callback: () => this.openSessionNote(),
    });

    window.addEventListener('beforeunload', (event) => {
      if (this.sessionNotes.length === 0) {
        return;
      }

      event.preventDefault();
      this.deleteSessionNotes();
    });

    this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
      this.checkTempNoteDeletion();
    }));
  }

  async openTempNote() {
    const file = await this.app.vault.create('Temp Note.md', '');
    this.tempNote = file;
    const leaf = this.app.workspace.getLeaf();
    leaf.openFile(file);
  }

  async openSessionNote() {
    let count = 1;
    let baseName = 'Session Note';
    let newFileName = `${baseName} ${count}.md`;

    while (this.app.vault.getAbstractFileByPath(newFileName)) {
      count++;
      newFileName = `${baseName} ${count}.md`;
    }

    const file = await this.app.vault.create(newFileName, '');
    this.sessionNotes.push(file);
    const leaf = this.app.workspace.getLeaf();
    leaf.openFile(file);
  }

  checkTempNoteDeletion() {
    const activeFile = this.app.workspace.getActiveFile();
    
    if (this.tempNote && (!activeFile || activeFile.path !== this.tempNote.path)) {
      this.app.vault.delete(this.tempNote);
      this.tempNote = undefined;
    }
  }

  async deleteSessionNotes() {
    const deletionPromises = this.sessionNotes.map(async (note) => {
      try {
        await this.app.vault.delete(note);
      } catch (error) {
        console.error(`Failed to delete session note: ${note.path}`, error);
      }
    });

    await Promise.allSettled(deletionPromises);
    this.sessionNotes = [];
    window.close();
  }

  onunload() {
    window.removeEventListener('beforeunload', () => this.deleteSessionNotes());
  }
}
