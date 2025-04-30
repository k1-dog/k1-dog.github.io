// /------title------------------------------------^---   -> 展示标题 + 折叠按钮
// |---------------|-<-Tab1----Tab2----Tab3----Tab4->-|   -> 展示滑动选项标签 + 前后翻滚按钮
// |-  IMG Cover  -|__________________________________|   -> 展示封面头像等图片
// |-             -|                                  |   -> (设计成文字环绕图片的方式, 更为优雅)
// |---------------|______________Content_____________|   -> 展示内容区域
// |- description -|              编辑 设置 <footer>  |
// |_______________|__________________________________|   -> 展示底部描述信息 + Footer插槽

import { Slot } from "vue";

// ::扩展功能:1. 各个卡片实例之间互相拖拽放置 | 2. 卡片内部各分隔区域之间, 可以拖动调整大小距离

//? <M9Card title="美九卡片标题" imgUrl="http://baidu.com">
//?   <template #title>自定义卡片标题</template>
//?   <template #description>自定义描述文本内容</template>
//?   <template #footer>自定义卡片尾部内容</template>
//?   <template #default>
//?     <M9Card.TabPane k-value="Tab1"><div>-1号-内容区域</div></M9Card.TabPane>
//?     <M9Card.TabPane k-value="Tab2"><div>-2号-内容区域</div></M9Card.TabPane>
//?     <M9Card.TabPane k-value="Tab3"><div>-3号-内容区域</div></M9Card.TabPane>
//?     <M9Card.TabPane k-value="Tab4"><div>-4号-内容区域</div></M9Card.TabPane>
//?  </template>
//? </M9Card>

// * 滑动卡片组件 - Props
export interface M9CardProps {
  title: string | Slot;
  tabKey: string;
  imgUrl?: string;
  collapse: boolean;
}

// * 滑动卡片组件 - State
export interface M9CardState {
  collapse: boolean;
  activeTabKey: string;
}