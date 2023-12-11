<template>
    <div class="monaco-file">
        <MonacoFileTree
            height="500px"
            width="100%"
        />
    </div>
</template>

<script setup lang="ts">
import  MonacoFileTree from '../dist/monaco-file-tree.es'
import "../dist/style.css"
// import MonacoFileTree from 'monaco-file-tree-test'
// import MonacoFileTree from 'monaco-file-tree-test';

</script>

<style scoped lang="scss">
.monaco-file{
    height: 100%;
    width: 100%;
}
</style>
