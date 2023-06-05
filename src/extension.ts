import * as vscode from "vscode";

interface VirtualFunction {
  line: number;
  name: string;
  className: string;
}

class VirtualFunctionsProvider {
  private virtualFunctions: VirtualFunction[] = [];
  private currentClass = '';

  public updateVirtualFunctions(document: vscode.TextDocument): void {
    this.virtualFunctions = [];
    this.currentClass = '';
    let currentClassCount = 0;

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);

      const classMatch = line.text.match(/^\s*(abstract_)?class\s+(\w+)/);
      if (classMatch) {
        this.currentClass = classMatch[1];
        currentClassCount = 0;
      }

      const virtualMatch = line.text.match(/^\s*\bvirtual\b.*\b(\w+)\s*\(.*/);
      if (virtualMatch && this.currentClass !== '') {
        currentClassCount++;
        const functionName = virtualMatch[1];
        const virtualFunction: VirtualFunction = {
          line: i,
          name: `[${currentClassCount - 1}]`,
          className: this.currentClass,
        };
        this.virtualFunctions.push(virtualFunction);
      }
    }
  }

  public provideVirtualFunctionDecorations(): vscode.DecorationOptions[] {
    return this.virtualFunctions.map((virtualFunction) => {
      const range = new vscode.Range(
        virtualFunction.line,
        0,
        virtualFunction.line,
        Number.MAX_VALUE
      );

      return {
        range,
        renderOptions: {
          before: {
            color: "#f5428d",
            contentText: virtualFunction.name,
            fontWeight: "bold",
          },
        },
      };
    });
  }
}

export function activate(context: vscode.ExtensionContext) {
  const virtualFunctionsProvider = new VirtualFunctionsProvider();

  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    virtualFunctionsProvider.updateVirtualFunctions(activeEditor.document);
  }

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    activeEditor = editor;
    if (editor) {
      virtualFunctionsProvider.updateVirtualFunctions(editor.document);
      updateDecorations();
    }
  }, null, context.subscriptions);

  vscode.workspace.onDidChangeTextDocument((event) => {
    if (activeEditor && event.document === activeEditor.document) {
      virtualFunctionsProvider.updateVirtualFunctions(event.document);
      updateDecorations();
    }
  }, null, context.subscriptions);

  const decorationType = vscode.window.createTextEditorDecorationType({
    before: {
      color: "#f5428d",
      fontWeight: "bold",
    },
  });

  function updateDecorations() {
    if (!activeEditor) {
      return;
    }

    const decorationOptions = virtualFunctionsProvider.provideVirtualFunctionDecorations();
    activeEditor.setDecorations(decorationType, decorationOptions);
  }

  if (activeEditor) {
    updateDecorations();
  }

  context.subscriptions.push(vscode.commands.registerCommand("virtual-counter.countVirtualFunctions", () => {
    if (activeEditor) {
      virtualFunctionsProvider.updateVirtualFunctions(activeEditor.document);
      updateDecorations();
    }
  }));
}
