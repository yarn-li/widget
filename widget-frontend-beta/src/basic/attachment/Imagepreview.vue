<template>
    <div></div>
</template>

<script lang="ts" setup>
import {computed, onMounted, toRef} from "vue";
    const emit = defineEmits(['download'])

    onMounted(() => {
        window.cl = () =>{
            let srcUrl = (document.querySelector('.el-image-viewer__img') as HTMLImageElement).src;
            emit('download', srcUrl)
        }
        let a=document.querySelector('.el-image-viewer__actions__inner');
        // $(a).append(`<i class="el-icon-download" onclick="installImage()"></i>`)
        // a.append( `<i class="el-icon-download" onclick="cl()"></i>`)
        let ff = document.createElement('i')
        ff.innerHTML = `<div onclick="cl()"></div>`
        a.appendChild(ff)
    })
    function downloadIamge(imgsrc, name){
        let image = new Image();
        // 解决跨域 Canvas 污染问题
        image.setAttribute("crossOrigin", "anonymous");
        image.onload = function() {
            let canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            let context = canvas.getContext("2d");
            context.drawImage(image, 0, 0, image.width, image.height);
            let url = canvas.toDataURL("image/png"); //得到图片的base64编码数据
            let a = document.createElement("a"); // 生成一个a元素
            let event = new MouseEvent("click"); // 创建一个单击事件
            a.download = name || "photo"; // 设置图片名称
            a.href = url; // 将生成的URL设置为a.href属性
            a.dispatchEvent(event); // 触发a的单击事件
        };
        image.src = imgsrc;
    }

</script>

