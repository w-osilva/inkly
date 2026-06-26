import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { DOMParser } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';

const content = document.createElement('div');
content.innerHTML = '<p>teh cat sat</p>';
const state = EditorState.create({
  doc: DOMParser.fromSchema(schema).parse(content),
  plugins: [keymap(baseKeymap)],
});
const view = new EditorView(document.querySelector('#editor') as HTMLElement, { state });
(window as unknown as { __pmText: () => string }).__pmText = () => view.state.doc.textContent;
(window as unknown as { __pmView: EditorView }).__pmView = view;
