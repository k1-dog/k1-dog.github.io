type M9EditorInnerHtml = string

export interface M9EditorPlugin {
  id: string;
  _html: M9EditorInnerHtml;
  _tips: string;
  doWhat: ($M9Editor: M9Editor) => void;
}

export interface M9EditorOptions {
  $dom: HTMLElement;
}

declare class M9Editor {
  toolBarFragment: DocumentFragment | null;
  plugins: M9EditorPlugin[];
  editorDOM: M9EditorOptions['$dom'];
  selection: Selection;
  constructor(options: M9EditorOptions);
  register (plugin: M9EditorPlugin): M9Editor;
  exec(cmd: string, value: string | undefined): void;
  __start(): void;
  getSelection(): Selection;
  __destruction(): void;
}