<template>
  <div
    v-show="node.visible"
    ref="fileTreeNodeRef"
    role="treeitem"
    class="tree-item"
    tabindex="-1"
    :aria-expanded="expanded"
    :aria-disabled="node.disabled"
    :aria-checked="node.checked"
    :data-key="getNodeKey(node)"
  >
    <div
      class="file-tree-label"
      :class="{
          'file-tree-label-is-active':node.id === currentNode?.id,
        }"
      :style="{ paddingLeft: (node.level - 1) * tree.props.indent + (node.isLeaf ? tree.props.indent : 0) + 'px' }"
      @click.stop="handleClick"
      @contextmenu="handleContextMenu"
    >
      <ExpandIcon
        v-if="!node.isLeaf && (tree.props.icon || CaretRight)"
        :class="{
          'file-tree-node-expand-icon':!node.isLeaf,
          'file-tree-node-expand-icon-expanded':!node.isLeaf && expanded
        }"
        @click.stop="handleExpandIconClick"
      >
        <component :is="tree.props.icon || CaretRight" />
      </ExpandIcon>
        <div v-if="isShowInput">
            <input
              ref="inputRef"
              v-model="editingNodeName"
              type="text"
              @blur="handleBlurInput(node)"
              @keydown.enter="handleAddFileNode(node)"
            >
        </div>
        <div
          v-else
          ref="fileContentRef"
          class="content"
          >
          {{ node.label }}
        </div>
          <!-- menu菜单 -->
          <FileMenu
            :visible="isShowMenu"
            :node="node"
            :file-menu-client-x="fileMenuClientX"
            :file-menu-client-y ="fileMenuClientY"
            @click-create-folder="handleFileType('folder')"
            @click-createfile="handleFileType('file')"
            @click-delete-file="deleteFile"
            @click-re-file-name="reFileName"
            @click-menu-mask="clickMaskLayer"
          />
  </div>
      <div
        v-show="expanded"
        class="file-tree-node-children"
        role="group"
        :aria-expanded="expanded"
      >
        <File-tree-node
          v-for="child in node.childNodes"
          :key="getNodeKey(child)"
          :render-content="renderContent"
          :node="child"
          :accordion="accordion"
          :props="props"
          @node-expand="handleChildNodeExpand"
        />
      </div>
  </div>
</template>
<script lang="ts">
// @ts-nocheck
import {
  defineComponent,
  getCurrentInstance,
  inject,
  nextTick,
  provide,
  ref,
  watch,
  onMounted,
  computed
} from 'vue';
import { isFunction, isString, getFileIconLabel } from './utils';
import { CaretRight } from '@element-plus/icons-vue';
import { getNodeKey as getNodeKeyUtil, handleCurrentChange } from './model/common';
import { useNodeExpandEventBroadcast } from './model/useNodeExpandEventBroadcast';
import Node from './model/node';
import FileMenu from './FileMenu.vue';
import type { ComponentInternalInstance, PropType } from 'vue';
import type { Nullable } from './utils';
import type { RootTreeType, TreeNodeData, TreeOptionProps } from './TreeType';
import './assets/vscode-icons.css';
import ExpandIcon from './Expand.vue';


export default defineComponent({
  name: 'FileTreeNode',
  components: {
    FileMenu,
    ExpandIcon
  },
  props: {
    node: {
      type: Node,
      default: () => ({})
    },
    props: {
      type: Object as PropType<TreeOptionProps>,
      default: () => ({})
    },
    accordion: Boolean,
    renderContent: Function
  },
  emits: ['node-expand'],
  setup(props, ctx) {
    const { broadcastExpanded } = useNodeExpandEventBroadcast(props);
    const tree = inject<RootTreeType>('RootTree');
    const currentNode = computed(() => tree?.store.value.currentNode);
    const currentRightClickNode = computed(() => tree?.store.value.currentRightClickNode);
    const editingNodeName = ref('');
    const isRenameingEdit = ref(false);
    const canShowMenu = ref(false);
    const inputRef = ref<Nullable<HTMLElement>>(null);
    const isShowInput = computed(() => {
      return currentNode.value?.id === props.node.id && props.node.data.label.trim() === '' || isRenameingEdit.value;
    });

    const isShowMenu = computed(() => props.node.id === currentRightClickNode.value?.id && canShowMenu.value);
    // menu位置
    const fileMenuClientX = ref(0);
    const fileMenuClientY = ref(0);
    const expanded = ref(false);
    const childNodeRendered = ref(false);
    const oldChecked = ref<boolean>(null);
    const oldIndeterminate = ref<boolean>(null);
    const fileTreeNodeRef = ref<Nullable<HTMLElement>>(null);
    const fileContentRef = ref<Nullable<HTMLElement>>(null);
    const instance = getCurrentInstance();
    provide('NodeInstance', instance);

    onMounted(() => {
      const fileTypeClass = getFileIconLabel(props.node.data.label, !props.node.isLeaf);
      fileContentRef.value?.classList.add(fileTypeClass);
    });

    if (props.node.expanded) {
      expanded.value = true;
      childNodeRendered.value = true;
    }

    const childrenKey = tree!.props.props.children || 'children';
    watch(
      () => {
        const children = props.node.data[childrenKey];
        return children && [...children];
      },
      () => {
        props.node.updateChildren();
      }
    );

    watch(
      () => props.node.indeterminate,
      (val) => {
        handleSelectChange(props.node.checked, val);
      }
    );

    watch(
      () => props.node.checked,
      (val) => {
        handleSelectChange(val, props.node.indeterminate);
      }
    );

    watch(
      () => props.node.expanded,
      (val) => {
        nextTick(() => (expanded.value = val));
        if (val) {
          childNodeRendered.value = true;
        }
      }
    );

    const getNodeKey = (node: Node): any => {
      return getNodeKeyUtil(tree!.props.nodeKey, node.data);
    };

    const getNodeClass = (node: Node) => {
      const nodeClassFunc = props.props.class;
      if (!nodeClassFunc) {
        return {};
      }
      let className;
      if (isFunction(nodeClassFunc)) {
        const { data } = node;
        className = nodeClassFunc(data, node);
      } else {
        className = nodeClassFunc;
      }

      if (isString(className)) {
        return { [className]: true };
      } else {
        return className;
      }
    };

    const handleSelectChange = (checked: boolean, indeterminate: boolean) => {
      if (
        oldChecked.value !== checked ||
        oldIndeterminate.value !== indeterminate
      ) {
        tree.ctx.emit('check-change', props.node.data, checked, indeterminate);
      }
      oldChecked.value = checked;
      oldIndeterminate.value = indeterminate;
    };

    const handleClick = (event: MouseEvent) => {
      const roleAttribute = (event.target as HTMLElement).getAttribute('role');
     if (roleAttribute && roleAttribute === 'mask') {
       return;
     }
      handleCurrentChange(tree.store, tree.ctx.emit, () =>
        tree.store.value.setCurrentNode(props.node)
      );
      tree.currentNode.value = props.node;

      if (tree.props.expandOnClickNode) {
        handleExpandIconClick();
      }

      tree.ctx.emit('node-click', props.node.data, props.node, instance, event);
    };
    // 右键操作
    const handleContextMenu = (event: MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();

      const roleAttribute = (event.target as HTMLElement).getAttribute('role');
     if (roleAttribute && roleAttribute === 'mask') {
       return;
     }
      fileMenuClientX.value = event.clientX;
      fileMenuClientY.value = event.clientY;
      canShowMenu.value = true;

      tree?.store.value.setCurrentRightClickNode(props.node);
      tree?.store.value.setCurrentNode(props.node);
      // 如果没展开就点击让其展开
      if (!props.node.expanded) {
        handleExpandIconClick();
      }

    };
    // 展开折叠
    const handleExpandIconClick = () => {
      if (props.node.isLeaf) return;
      if (expanded.value) {
        props.node.collapse();
      } else {
        props.node.expand();
        ctx.emit('node-expand', props.node.data, props.node, instance);
      }
    };

    const handleCheckChange = (value, ev) => {
      props.node.setChecked(ev.target.checked, !tree.props.checkStrictly);
      nextTick(() => {
        const store = tree.store.value;
        tree.ctx.emit('check', props.node.data, {
          checkedNodes: store.getCheckedNodes(),
          checkedKeys: store.getCheckedKeys(),
          halfCheckedNodes: store.getHalfCheckedNodes(),
          halfCheckedKeys: store.getHalfCheckedKeys()
        });
      });
    };

    const handleChildNodeExpand = (
      nodeData: TreeNodeData,
      node: Node,
      instance: ComponentInternalInstance
    ) => {
      broadcastExpanded(node);
      tree.ctx.emit('node-expand', nodeData, node, instance);
    };

    /** --------menu文件操作-------------- */
    // 检查同层级是否有同名文件名
    const checkSameName = (fileName: string, parentNode: Node, targetNode: Node) => {
      const childNodes = parentNode.childNodes;
      for (let i = 0; i < childNodes.length; i++) {
        const childNode = childNodes[i];
        if (childNode.data.label === fileName && childNode.isLeaf === targetNode.isLeaf) {
          return true;
        }
      }
      return false;
    };
    // 新建文件
    nextTick(() => {
      if (inputRef.value) {
        (inputRef.value as HTMLInputElement).focus();
      }
    });
    // 处理文件或文件夹
    const handleFileType = (type: 'file'|'folder') => {
      const parentNode = props.node;
      // 暂时先设置成父节点的pathKey，等命名通过后再拼接
      const path = parentNode.data.pathKey;
      const newData = {
        label: '',
        value: '',
        id: 200,
        pathKey: path
      };
      if (type === 'folder') {
        newData.children = [];
      }
      tree?.store.value.append(newData, parentNode);
      const childNodes = parentNode.childNodes.length;
      const newNode = parentNode.childNodes[childNodes - 1];
      const preCurrentNode = tree?.store.value.getCurrentNode();
      tree?.store.value.setPreCurrentNode(preCurrentNode);
      tree?.store.value.setCurrentNode(newNode);
      tree?.store.value.setCurrentRightClickNode(newNode);
    };
    // 失去焦点处理
    const handleBlurInput = (targetNode: Node) => {
      // 重置所有状态
        handleAddFileNode(targetNode);
    };
    // 增加文件或文件夹或者修改
    const handleAddFileNode = (targetNode: Node) => {
        const targetData = targetNode.data;
        const currentLabelName = targetNode.data.label;
        const parentNode = targetNode.parent;
        const hasSameName = checkSameName(editingNodeName.value, parentNode, targetNode);
        const preCurrentNode = tree?.store.value.getPreCurrentNode();
        // 输入的文件名不为空 &&  同层级没有重名  ｜｜重命名后还是同一名字
        if (editingNodeName.value.trim() !== '' && (!hasSameName || currentLabelName === editingNodeName.value)) {
          // 更新当前节点
          targetData.pathKey = targetData.pathKey + '/' + editingNodeName.value;
          targetData.label = editingNodeName.value;
          tree.ctx.emit('node-click', targetNode.data, targetNode);
          nextTick(() => {
            // 更新文件类型icon
            const fileTypeClass = getFileIconLabel(targetData.label, !props.node.isLeaf);
            fileContentRef.value?.classList.add(fileTypeClass);
          });


        } else {
          if (preCurrentNode) {
            tree?.store.value.setCurrentNode(preCurrentNode);
            tree?.store.value.setPreCurrentNode(null);
          }

          ElMessage({
            showClose: true,
            message: "不能同名或为空",
            type: "error"
          });
          // 重命名就保持原名
          if (isRenameingEdit.value) {
            targetData.label = currentLabelName;
          } else {
            // 新建的话就直接删除
            tree?.store.value.remove(targetNode);
          }
        }
        isRenameingEdit.value = false;
    };
    // 删除文件
    const deleteFile = () => {
      const targetNode = props.node;
      tree?.store.value.remove(targetNode);
    };

    // 关闭menu
    const handleCloseMenu = () => {
      canShowMenu.value = false;
    };
    // 点击menu蒙层
    const clickMaskLayer = () => {
      handleCloseMenu();
    };
    // // 重命名文件名
    const reFileName = () => {
      const targetNode = props.node;
      isRenameingEdit.value = true;
      editingNodeName.value = targetNode.data.label;
        nextTick(() => {
          if (inputRef.value) {
              (inputRef.value as HTMLInputElement).focus();
            }
        });
    };


    return {
      fileTreeNodeRef,
      fileContentRef,
      tree,
      expanded,
      childNodeRendered,
      oldChecked,
      oldIndeterminate,
      getNodeKey,
      getNodeClass,
      handleSelectChange,
      handleClick,
      handleContextMenu,
      handleExpandIconClick,
      handleCheckChange,
      handleChildNodeExpand,
      CaretRight,
      currentNode,
      currentRightClickNode,
      // 文件操作
      inputRef,
      fileMenuClientX,
      fileMenuClientY,
      clickMaskLayer,
      editingNodeName,
      isShowMenu,
      isShowInput,
      handleFileType,
      handleBlurInput,
      handleAddFileNode,
      deleteFile,
      reFileName,
      getFileIconLabel
    };
  }
});
</script>

<style scoped lang="scss">
.tree-item {
   width: 100%;
  min-width: fit-content;
  .file-tree-label {
    width: 100%;
    display: flex;
    align-items: center;
    height: 25px;
    line-height: 25px;
    white-space: nowrap;
    cursor: pointer;
    color: #000;
    &:hover{
      background-color: #f3f6f8;
      color: #000;
    }
    .file-tree-node-expand-icon {
      cursor: pointer;
      transform: rotate(0);
      transition: transform var(--el-transition-duration) ease-in-out;
    }
    .file-tree-node-expand-icon-expanded {
      transform: rotate(90deg);
    }
    .content {
      display: flex;
      align-items: center;
    }
  }
  .file-tree-label-is-active {
      background-color: #8d8d8e;
      color: #fff;
  }
}


</style>