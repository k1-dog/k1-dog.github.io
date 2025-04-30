//?   <Tabs v-model:activeKey="ak">
//?     <TabPane k="Tab1" title="标签1"><div>-1号-内容区域</div></TabPane>
//?     <TabPane k="Tab2" title="标签2"><div>-2号-内容区域</div></TabPane>
//?     <TabPane k="Tab3" title="标签3"><div>-3号-内容区域</div></TabPane>
//?     <TabPane k="Tab4" title="标签4"><div>-4号-内容区域</div></TabPane>
//?  </Tabs>

export interface M9TabsProps {
  activeKey: string; // 正在激活的标签key
}

export interface M9TabsState {
  activeKey: string; // 正在激活的标签key
  slideOffsetV: number; // 滑动窗口需要滑动的距离数值
}

export interface M9TabsEmits {
  change: ($AK: M9TabsProps['activeKey']) => void;
  'update:activeKey': ($AK: M9TabsProps['activeKey']) => void;
}