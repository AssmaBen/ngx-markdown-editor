import { Component, ViewChild, forwardRef, Renderer, Attribute, Input } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor, NG_VALIDATORS, Validator, AbstractControl, ValidationErrors } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';

declare let ace: any;
declare let marked: any;
declare let hljs: any;

@Component({
  selector: 'md-editor',
  styleUrls: ['./md-editor.css'],
  templateUrl: './md-editor.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarkdownEditorComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => MarkdownEditorComponent),
      multi: true
    }
  ]
})

export class MarkdownEditorComponent implements ControlValueAccessor, Validator {

  @ViewChild('aceEditor') aceEditorContainer;

  @Input()
  hideToolbar: boolean = false;

  @Input()
  height: string = "300px";

  get markdownValue(): any {
    return this._markdownValue || '';
  }
  set markdownValue(value: any) {
    this._markdownValue = value;
    this._onChange(value);
    if (value !== null && value !== undefined) {
      if (this._renderMarkTimeout) clearTimeout(this._renderMarkTimeout);
      this._renderMarkTimeout = setTimeout(() => {
        let html = marked(this._markdownValue || '');
        this._previewHtml = this._domSanitizer.bypassSecurityTrustHtml(html);
      }, 100);
    }
  }
  _markdownValue: any;

  _renderMarkTimeout: any;

  editor: any;

  showPreviewPanel: boolean = true;
  isFullScreen: boolean = false;

  _markedRender: any;
  _previewHtml: any;

  _onChange = (_: any) => { };
  _onTouched = () => { };

  constructor(
    @Attribute('required') public required: boolean = false,
    @Attribute('maxlength') public maxlength: number = -1,
    private _renderer: Renderer,
    private _domSanitizer: DomSanitizer) {

  }

  ngOnInit() {
    this._markedRender = new marked.Renderer();
    this._markedRender.code = (code: any, language: any) => {
      const validLang = !!(language && hljs.getLanguage(language));
      const highlighted = validLang ? hljs.highlight(language, code).value : code;
      return `<pre style="padding: 0; border-radius: 0;"><code class="hljs ${language}">${highlighted}</code></pre>`;
    };
    marked.setOptions(this._markedRender);
  }

  ngAfterViewInit() {
    let editorElement = this.aceEditorContainer.nativeElement;
    this.editor = ace.edit(editorElement);
    this.editor.$blockScrolling = Infinity;
    this.editor.getSession().setUseWrapMode(true);
    this.editor.getSession().setMode('ace/model/javascript');
    this.editor.getSession().setValue(this.markdownValue);

    this.editor.on("change", (e) => {
      let val = this.editor.getValue();
      this.markdownValue = val;
    });
  }

  ngOnDestroy() {
  }

  writeValue(value: any | Array<any>): void {
    setTimeout(() => {
      this.markdownValue = value;
      if (value && this.editor) {
        this.editor.getSession().setValue(value);
      }
    }, 1);
  }

  registerOnChange(fn: (_: any) => {}): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => {}): void {
    this._onTouched = fn;
  }

  validate(c: AbstractControl): ValidationErrors {
    let result: any = null;
    if (this.required && this.markdownValue.length === 0) {
      result = { required: true };
    }
    if (this.maxlength > 0 && this.markdownValue.length > this.maxlength) {
      result = { maxlength: true };
    }
    return result;
  }

  insertContent(type: string) {
    if (!this.editor) return;
    let selectedText = this.editor.getSelectedText();
    let isSeleted = !!selectedText;
    let startSize = 2;
    let initText: string = '';
    let range = this.editor.selection.getRange();
    switch (type) {
      case 'Bold':
        initText = 'Bold Text';
        selectedText = `**${selectedText || initText}**`;
        break;
      case 'Italic':
        initText = 'Italic Text';
        selectedText = `*${selectedText || initText}*`;
        startSize = 1;
        break;
      case 'Heading':
        initText = 'Heading';
        selectedText = `# ${selectedText || initText}`;
        break;
      case 'Refrence':
        initText = 'Refrence';
        selectedText = `> ${selectedText || initText}`;
        break;
      case 'Link':
        selectedText = `[](http://)`;
        startSize = 1;
        break;
      case 'Image':
        selectedText = `![](http://)`;
        break;
      case 'Ul':
        selectedText = `- ${selectedText || initText}`
        break;
      case 'Ol':
        selectedText = `1. ${selectedText || initText}`
        startSize = 3;
        break;
      case 'Code':
        initText = 'Source Code';
        selectedText = "```language\r\n" + (selectedText || initText) + "\r\n```";
        startSize = 3;
        break;
    }
    this.editor.session.replace(range, selectedText);
    if (!isSeleted) {
      range.start.column += startSize;
      range.end.column = range.start.column + initText.length;
      this.editor.selection.setRange(range);
    }
    this.editor.focus();
  }

  togglePreview() {
    this.showPreviewPanel = !this.showPreviewPanel;
    this.editorResize();
  }

  previewPanelClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();
  }

  fullScreen() {
    this.isFullScreen = !this.isFullScreen;
    this._renderer.setElementStyle(document.body, 'overflowY', this.isFullScreen ? 'hidden' : 'auto');
    this.editorResize();
  }

  editorResize(timeOut: number = 100) {
    if (this.editor) {
      setTimeout(() => {
        this.editor.resize();
        this.editor.focus();
      }, timeOut);
    }
  }
}
