<template>
    <div
        v-if="props.visible"
        class="operate-menu-mask-layer"
        role="mask"
        @click="clickMaskLayer"
        @contextmenu="clickMaskLayer"
    >
        <div
        class="menu-content"
        :style="{ left: fileMenuClientX + 'px', top: fileMenuClientY + 'px' }"
        >
            <div v-if="isBaseFileArea || !node?.isLeaf" @click.stop="createFile">新建文件</div>
            <div v-if="isBaseFileArea || !node?.isLeaf" @click.stop="createFolder">新建文件夹</div>
            <div v-if="!isBaseFileArea" @click="deleteFile">删除文件</div>
            <div v-if="!isBaseFileArea" @click="reFileName">重命名</div>
        </div>
    </div>
</template>

<script setup lang='ts'>
import Node from './model/node';
interface IMenuProps {
    visible: boolean;
    node?: Node;
    fileMenuClientX: number;
    fileMenuClientY: number;
    isBaseFileArea?: boolean
}
const emits = defineEmits([
    'click-menu-mask',
    'click-createfile',
    'click-createFolder',
    'click-deleteFile',
    'click-reFileName'
]);
const props = withDefaults(defineProps<IMenuProps>(), {
    visible: false,
    fileMenuClientX: 0,
    fileMenuClientY: 0,
    isBaseFileArea: false
});
const createFile = () => {
    emits('click-createfile');
};
const createFolder = () => {
    emits('click-createFolder');
};
const deleteFile = () => {
    emits('click-deleteFile');
};
const reFileName = () => {
    emits('click-reFileName');
};
const clickMaskLayer = (event) => {
    emits('click-menu-mask', event);
};

</script>
<style scoped lang="scss">
.operate-menu-mask-layer {
    position: fixed;
    z-index: 999;
    inset: 0;
    width: 100%;
    height: 100%;
    cursor: auto;
    .menu-content{
        position: relative;
        background-color: #fff;
        height: auto;
        width: 100px;
        padding: 5px;
        border-radius: 10px;
        color: #000;
        cursor: pointer;
        &>div{
        margin-bottom: 5px;
        border-radius: 5px;
        padding: 0 5px;
        text-align: left;
            &:hover{
                background-color:#515457;
                color: #fff;
            }
        }
    }
}
</style>