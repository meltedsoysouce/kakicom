declare global {
  interface Window {
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
    showOpenFilePicker?: (options?: OpenFilePickerOptions) => Promise<FileSystemFileHandle[]>;
  }

  interface SaveFilePickerOptions {
    suggestedName?: string;
    types?: FilePickerAcceptType[];
  }

  interface OpenFilePickerOptions {
    multiple?: boolean;
    types?: FilePickerAcceptType[];
  }

  interface FilePickerAcceptType {
    description?: string;
    accept: Record<string, string[]>;
  }
}

function hasFileSystemAccess(): boolean {
  return "showSaveFilePicker" in window && "showOpenFilePicker" in window;
}

const FILE_PICKER_OPTIONS = {
  types: [
    {
      description: "Kakicom Export",
      accept: { "application/json": [".kakicom.json"] },
    },
  ],
};

/**
 * ファイル保存（エクスポート）。
 * File System Access API が利用可能ならネイティブダイアログ、
 * 不可ならダウンロードリンクのフォールバック。
 */
export async function saveFile(content: string, suggestedName: string): Promise<void> {
  if (hasFileSystemAccess()) {
    const handle = await window.showSaveFilePicker!({
      suggestedName,
      ...FILE_PICKER_OPTIONS,
    });
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  } else {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * ファイル読み込み（インポート）。
 * File System Access API が利用可能ならネイティブダイアログ、
 * 不可なら <input type="file"> のフォールバック。
 * ユーザーがキャンセルした場合は null を返す。
 */
export async function loadFile(): Promise<string | null> {
  if (hasFileSystemAccess()) {
    let handles: FileSystemFileHandle[];
    try {
      handles = await window.showOpenFilePicker!({
        multiple: false,
        ...FILE_PICKER_OPTIONS,
      });
    } catch {
      return null;
    }
    const file = await handles[0].getFile();
    return await file.text();
  } else {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".kakicom.json,.json";
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        resolve(await file.text());
      });
      input.click();
    });
  }
}
