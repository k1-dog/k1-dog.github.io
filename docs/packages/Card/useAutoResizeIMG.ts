import { onMounted, watch } from "vue";
import { ResizeIMG } from "../M9-Utils/helper";


export default function useAutoResizeIMG (props, imgRef) {
  const expectSize = 160
  function hook ($imgSrc) {
    ResizeIMG($imgSrc, expectSize).then((imgStat) => {
      let { IMG, NW, NH } = imgStat
      IMG = null as any
      imgRef.value.width = NW
      imgRef.value.height = NH
    })
  }
  watch(() => props.imgUrl, (imgSrc) => {
    hook(imgSrc)
  })
  onMounted(() => {
    hook(props.imgUrl)
  })
}