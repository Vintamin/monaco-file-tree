<template>
    <div class="monaco-area">
        <div  class="monaco-header">
            <div class="monaco-filename">{{  curModelFileName ?? '' }}</div>
            <div class="monaco-operate">
                <div  @click="handleSave" class="btn">保存</div>
                <div  @click="handleCopy" class="btn">复制</div>
            </div>
        </div>
        <div ref="monacoRef" :style="{ width: '100%', height: '100%' }" class="monaco-content" ></div>
    </div>
</template>

<script setup lang='ts'>
import { ref, onMounted, watch, nextTick, inject, computed } from 'vue';
// import * as monaco from "monaco-editor";
// 按需加载
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/editor/contrib/folding/browser/folding.js'; // 折叠
import 'monaco-editor/esm/vs/editor/contrib/format/browser/formatActions.js'; // 格式化代码
import 'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggestController.js'; // 代码联想提示
import 'monaco-editor/esm/vs/editor/contrib/tokenization/browser/tokenization.js'; // 代码联想提示
import "monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution"; // 代码高亮&提示
import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution"; // 代码高亮&提示
import "monaco-editor/esm/vs/language/typescript/monaco.contribution"; // 代码高亮&提示


import { copyToClipboard } from "../utils";
import { FileTreeItem } from '../FileTree/constant';
// @ts-ignore
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker&inline';
// @ts-ignore
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker&inline';
// @ts-ignore
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker&inline';
// @ts-ignore
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker&inline';
// @ts-ignore
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker&inline';

// 获取文件树
const fileTreeData = inject('fileTreeData', ref([]));
interface IFilePath {
    [key: string]: string
}
interface ICodeProps {
    lang: string;
    filePath: string
}
const emit = defineEmits<{
    (event: 'saveCode', fileContent: string): void;
    (event: 'toFileNode', filePath: string): void;
}>();
const props = defineProps<ICodeProps>();
const monacoRef = ref();

// editor对象 IStandaloneCodeEditor类型
const curModelFileName = computed(() => {
    if (!props.filePath) {
        return undefined;
    }
    const model = monacoEditor.getModel();
    const name = model.uri.path.split('/').pop();
    return name;

});
let monacoEditor;
 // @ts-ignore
 self.MonacoEnvironment = {
    getWorker(workerId, label) {
      if (label === 'json') {
        return new jsonWorker();
      }
      if (label === 'css' || label === 'scss' || label === 'less') {
        return new cssWorker();
      }
      if (label === 'html') {
        return new htmlWorker();
      }
      if (['typescript', 'javascript'].includes(label)) {
        return new tsWorker();
      }
      return new editorWorker();
    }
  };
const filePathsMap = ref<IFilePath>();
// 默认的model
const defaultModel = monaco.editor.createModel('', 'typescript', new monaco.Uri().with({ authority: 'defaultModel' }));
let suggestions: any[] = [];
// 根据文件路径判断是否是文件夹
function judgeIsFolder(path: string) {
    const lastItem = path.split('/').pop();
    return lastItem === '' || !lastItem?.includes('.');
}
let needMatchLevelPath = '';
let preCurPathContent = ''; // 上次完整路径
// 处理路径代码提示的suggestions
function handleSuggestions(firstMatchContent, secendMatchContent, curModel, curPathContent) {
    const currentUriPath = curModel!.uri.path;
    const basePathRegex = /(\/[^/]+)\//;
    const baseFolderPath = currentUriPath.match(basePathRegex)[1];// 根目录层级 /apps
    // const baseFolderPath = '/';// 根目录层级 /apps

    // 初次匹配
    if (!secendMatchContent) {
        if (firstMatchContent === '/') {
            // 绝对路径 取根目录
            needMatchLevelPath = baseFolderPath;

        } else if (firstMatchContent === './') {
            // 相对路径
            needMatchLevelPath = currentUriPath.slice(0, currentUriPath.lastIndexOf('/'));
        } else {
             // 父级路径
            const lastIndex = currentUriPath.lastIndexOf('/');
            const secondLastIndex = currentUriPath.lastIndexOf('/', lastIndex - 1);
            needMatchLevelPath = currentUriPath.slice(0, secondLastIndex);
        }

    } else {
        // 匹配后续
        if (secendMatchContent === './') {
            // 同层级
            needMatchLevelPath = needMatchLevelPath;// 不变
        } else if (secendMatchContent === '../') {
            // 上一层级
            if (needMatchLevelPath !== baseFolderPath) {
                // 如果未到根目录则变化
                needMatchLevelPath = needMatchLevelPath.split('/').slice(0, -1).join('/');// 回到上一层级
            }
        } else {
            // build/ 有指定的文件夹下
            if (curPathContent !== preCurPathContent) {
                // 如果是路径不一致，继续使用，否则就延续上次的
                needMatchLevelPath += '/' + secendMatchContent.slice(0, -1); // secendMatchContent本身是build/,所以要去除最后的/和在最前增加/
            }
            preCurPathContent = curPathContent;
        }
    }
    const currentFolderEntries = monaco.editor.getModels()
            .filter((m) => {
                const filePath = m.uri.path;
                // 去除自己
                return currentUriPath !== filePath && filePath.startsWith(needMatchLevelPath) && filePath.lastIndexOf('/') === needMatchLevelPath.length ;
            })
            .map((m) => {
                const filePath = m.uri.path;
                const isFolder = judgeIsFolder(filePath);
                const name = filePath.split('/').pop();
                return { name, isFolder };
            });
        suggestions = currentFolderEntries.map((entry) => {
            if (entry.isFolder) {
                return {
                    label: entry.name,
                    kind: monaco.languages.CompletionItemKind.Folder,
                    insertText: entry.name + '/'
                };
                } else {
                return {
                    label: entry.name,
                    kind: monaco.languages.CompletionItemKind.File,
                    insertText: entry.name
                };
            }
        });
        if (suggestions.length) {
            nextTick(() => {
                monacoEditor.trigger(
                'typescript',
                'editor.action.triggerSuggest'
            );
            });
        }

}
// 打开当前的model
function openFile(path) {
    
    const model = monaco.editor
        .getModels()
        .find(model => {
            return model.uri.path === path;
        });
        model?.setValue(filePathsMap.value![path]);
        monacoEditor.setModel(model);
        model!.onDidChangeContent((event) => {
            const change = event.changes[0];
            const lineNumber = change.range.startLineNumber;
            const lineContent = model!.getLineContent(lineNumber);
            const importPathRegex = /^\s*import\s+.+from\s+['"](\.\.\/|\.\/|\/)(\.\.\/|\.\/|[a-zA-Z0-9-_]+\/)*['"]/;// 包含相对和绝对路径的全部情况
            const importAbsoluteRegex = /^\s*import\s+.+from\s+['"]\s*\/(([a-zA-Z0-9]+)*\/)*['"];?/;// 绝对路径
            const importRelativeRegex = /^\s*import\s+.+from\s+['"]\s*\.(\/[a-zA-Z0-9]+)*\/['"];?/; // 相对路径
            const matchRelative = lineContent.match(importRelativeRegex);
            const matchAbsolute = lineContent.match(importAbsoluteRegex);
            const matchPath = lineContent.match(importPathRegex);
            if (matchPath) {
                const curPathContent = lineContent.match(/['"](.*)['"]/)![0];
                const firstMatchContent = matchPath[1];// 匹配到的第一个括号内的内容，也就是初始./ ｜ ../ | /
                const secendMatchContent = matchPath[2]; // 匹配到的第二个括号内的那日，有可能是 undefined（初始时候） | ./ | ../ | / | xxx/
                handleSuggestions(firstMatchContent, secendMatchContent, model, curPathContent);
            }
    });
}
// 监听文件变化
watch(() => props.filePath, (newVal) => {
    // 删除的逻辑，文件路径数组为空，此时model设为默认的
    if (!newVal) {
        monacoEditor.setModel(defaultModel);
        return;
    }
    // let curFilePath = newVal.join('/');
    // curFilePath = '/' + curFilePath;
    const curFilePath = '/' + newVal;
    
    // 如果是文件夹则不打开
    if (judgeIsFolder(curFilePath)) {
        return;
    }
    openFile(curFilePath);


}, { deep: true });
watch(() => props.lang, (newVal) => {
    
    monacoEditor.updateOptions({
        readOnly: false
    });
    // 更新语言类型
    monaco.editor.setModelLanguage(monacoEditor.getModel(), newVal);
});



// 构建file path的数组对应n个model
function handleFilePaths (filePathArr: FileTreeItem[]) {
    const filePaths: IFilePath = {};
    const fileNamePaths: string[] = [];
    function traversePath(pathArr) {
        // 不存在直接return
        if (!pathArr) {
            return;
        }
        for (let i = 0; i < pathArr.length; i++) {
            const pathItem = pathArr[i];
            fileNamePaths.push(pathItem.label);
            let fileRelativePath = fileNamePaths.join('/');
            fileRelativePath = '/' + fileRelativePath;

            // 文件夹也得存，为了路径代码提示
            filePaths[fileRelativePath] = pathItem.value;
            traversePath(pathItem.children);
            fileNamePaths.pop();
        }
    }
    traversePath(filePathArr);
    return filePaths;
}

watch(fileTreeData, (newVal, oldVal) => {
    filePathsMap.value = handleFilePaths(newVal);


    const models = monaco.editor.getModels();
    for (let i = 0; i < models.length; i++) {
        const model = models[i];
        // 保留默认的model
        if (model.uri.authority && model.uri.authority === 'defaultModel') {
            continue;
        }
        model.dispose();
    }

    Object.keys(filePathsMap.value).forEach((path) => {
            monaco.editor.createModel(
                filePathsMap.value![path],
                'typescript',
                new monaco.Uri().with({ path })
            );
    });
    // 当前已打开了model
    if (props.filePath) {
        let curFilePath = '/' + props.filePath;
        const newModels = monaco.editor.getModels();
        const curEditModedl = newModels.find(model => model.uri.path === curFilePath);
        monacoEditor.setModel(curEditModedl);
    }


}, {
    deep: true
});
// 初始化
function initCustomFormatter() {
    monacoEditor = monaco.editor.create(monacoRef.value, {
        theme: "vs-dark", // 主题
        value: '', // 默认显示的值
        language: props.lang,
        readOnly: false,
        domReadOnly: true,
        cursorStyle: "line",
        folding: true, // 是否折叠
        foldingHighlight: true, // 折叠等高线
        foldingStrategy: "indentation", // 折叠方式  auto | indentation
        showFoldingControls: "always", // 是否一直显示折叠 always | mouseover
        disableLayerHinting: true, // 等宽优化
        emptySelectionClipboard: false, // 空选择剪切板
        selectionClipboard: false, // 选择剪切板
        automaticLayout: true, // 自动布局
        codeLens: false, // 代码镜头
        scrollBeyondLastLine: false, // 滚动完最后一行后再滚动一屏幕
        colorDecorators: true, // 颜色装饰器
        accessibilitySupport: "on", // 辅助功能支持  "auto" | "off" | "on"
        lineNumbers: "on", // 行号 取值： "on" | "off" | "relative" | "interval" | function
        lineNumbersMinChars: 5, // 行号最小字符   number
        contextmenu: true, // 启用上下文菜单
        autoClosingBrackets: 'always' // 是否自动添加结束括号(包括中括号) "always" | "languageDefined" | "beforeWhitespace" | "never"
        // model: null // 此处model设为null，是阻止默认创建的空model
      });
      // 初始默认model
    monacoEditor.setModel(defaultModel);
    // 获取 TypeScript 编译器的默认选项
    const compilerOptions = monaco.languages.typescript.typescriptDefaults.getCompilerOptions();;
    compilerOptions.allowSyntheticDefaultImports = true;
    compilerOptions.strict = false;
    compilerOptions.baseUrl = './';
    compilerOptions.allowImportingTsExtensions = true;
    compilerOptions.module = monaco.languages.typescript.ModuleKind.ESNext;
    // 模块解析策略
    compilerOptions.moduleResolution = monaco.languages.typescript.ModuleResolutionKind.NodeJs;

    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
    // 应用修改后的选项
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
      // ctrl +点击跳转
    const editorService = monacoEditor._codeEditorService;
    const openEditorBase = editorService.openCodeEditor.bind(editorService);
    editorService.openCodeEditor = async (input, editor) => {
        const result = await openEditorBase(input, editor);

        if (result === null) {
            const targetFilePath = input.resource.path;
            const fullPath = input.resource.path;
            // 修改当前编辑区域的标题

            // 修改左侧文件树的选中状态
            emit('toFileNode', targetFilePath);

            // 跳转到对应的model
            editor.setModel(monaco.editor.getModel(input.resource));
            // 此处还可以自行添加文件选中态等处理
            // 设置选中区以及聚焦的行数
            editor.setSelection(input.options.selection);
            editor.revealLine(input.options.selection.startLineNumber);
        }
        return result; // always return the base result
    };

    // 禁用了语义验证和语法验证
    // monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    //         noSemanticValidation: true,
    //         noSyntaxValidation: true
    // });

    // 按键监听 ctrl+s
    monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function () {
        handleSave();
    });
    // 监听选择提示信息的事件
    monacoEditor.onDidChangeCursorSelection((event) => {
        const selection = monacoEditor.getSelection();
        const suggestionsWidget = monacoEditor.getContribution("editor.contrib.suggestWidget");
        if (selection && suggestionsWidget && suggestionsWidget.widget && suggestionsWidget.widget.isVisible) {
            const selectedSuggestion = suggestionsWidget.widget.getSelectedSuggestion();
            if (selectedSuggestion) {
            // 在这里可以进行处理，比如获取选中的 suggestion 对象，执行相应的操作
            }
        }
    });

    // 注册自定义代码提示提供程序
    // 初始化时注册代码提示提供程序
    monaco.languages.registerCompletionItemProvider('typescript', {
        provideCompletionItems: (model, position, token, context) => {
            // 初始时不返回任何提示项
            return {
                suggestions: suggestions
            };
        }
    });
}

onMounted(() => {
    initCustomFormatter();
});

// 保存操作
function handleSave() {
    const model = monacoEditor.getModel();
    const monacoContent = model.getValue();
    // 更新文件内容
    emit('saveCode', monacoContent);
}
// 复制操作
function handleCopy() {
    const model = monacoEditor.getModel();
    const monacoContent = model.getValue();
    copyToClipboard(monacoContent);
    // ElMessage({
    //     showClose: true,
    //     message: "复制成功",
    //     type: "success"
    // });
}



</script>
<style scoped lang="scss">
.monaco-area {
    height: 100%;
    flex: 1;
    width: 100%;
    display: flex;
    flex-direction: column;
    .monaco-header{
        display: flex;
        justify-content: space-between;
        box-sizing: border-box;
        border: 2px #e6e6e6 solid;
        height: 30px;
        width: 100%;
        background-color: #000;
        .monaco-filename {
            box-sizing: border-box;
            color: #fff;
            background-color: #5f5f5f;
            padding: 3px;
        }
        .monaco-operate {
            display: flex;
            .btn{
                background-color: #fff;
                border-radius: 5px;
                width: 60px;
                margin: 0 5px;
                cursor: pointer;
                height: 100%;
                vertical-align: middle;
            }
        }
    }
    .monaco-content{
        flex: 1;
        :deep(.monaco-editor .view-line ){
            text-align: left !important;
        }

    }

}

</style>