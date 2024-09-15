import{c as m,J as b,p,m as a,a as _,a3 as f,E as T,o as M}from"./chunks/framework.Y68m4OXf.js";const x=a("h2",{id:"表格",tabindex:"-1"},[_("表格 "),a("a",{class:"header-anchor",href:"#表格","aria-label":'Permalink to "表格"'},"​")],-1),C=a("p",null,[a("strong",null,"示例")],-1),F=f(`<p><strong>代码</strong></p><div class="language-html vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">html</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&lt;</span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">template</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&gt;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">  &lt;</span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">m9-table</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> :MTableColumns</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;MTHColumns&quot;</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> :MikuDataSource</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;MTDataSource&quot;</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> :MKey</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;&#39;key&#39;&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&gt;&lt;/</span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">m9-table</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&gt;</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&lt;/</span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">template</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&gt;</span></span></code></pre></div><h2 id="api" tabindex="-1">API <a class="header-anchor" href="#api" aria-label="Permalink to &quot;API&quot;">​</a></h2><table><thead><tr><th>属性</th><th style="text-align:center;">说明</th><th style="text-align:right;">类型</th><th style="text-align:right;">默认值</th></tr></thead><tbody><tr><td>MTableColumns</td><td style="text-align:center;">表头数据配置</td><td style="text-align:right;">MTableColumns</td><td style="text-align:right;">[]</td></tr><tr><td>MikuDataSource</td><td style="text-align:center;">表身数据源配置</td><td style="text-align:right;">MikuDataSource</td><td style="text-align:right;">[]</td></tr></tbody></table><p><strong>事件</strong></p><table><thead><tr><th>事件名称</th><th style="text-align:center;">说明</th><th style="text-align:right;">参数</th></tr></thead><tbody><tr><td>onChangePagi</td><td style="text-align:center;">分页点击事件</td><td style="text-align:right;">(pagi: PagiInfo) =&gt; void</td></tr></tbody></table>`,6),q=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"components/Table/Table.md","filePath":"components/Table/Table.md"}'),A={name:"components/Table/Table.md"},D=Object.assign(A,{setup(S){const k="miku",s=Array.from({length:10},(i,t)=>({key:k+"-"+t,title:"美九-"+t,fixed:t<2?"left":t>5?"right":void 0,sortable:t===6,filterable:t===1,isTreeNode:t===0}));Array.from({length:1e5},(i,t)=>s.reduce((e,l,n)=>(e[l.key]="美九-"+t+"-"+n,Math.ceil(t/100)===Math.floor(t/100)&&(e.children=Array.from({length:10},(P,r)=>s.reduce((h,c,o)=>(h[c.key]="孩子-"+t+"-"+r+"."+o,r===1&&(h.children=Array.from({length:5},(v,u)=>s.reduce((d,y,E)=>(d[y.key]="孙子-"+t+"-"+r+"."+o+">"+u+"."+E,d),{}))),h),{}))),e),{}));const g=Array.from({length:1e5},(i,t)=>s.reduce((e,l,n)=>(e[l.key]="美九-"+t+"-"+n,e),{}));return(i,t)=>{const e=T("m9-table");return M(),m("div",null,[x,C,b(e,{MTableColumns:p(s),MikuDataSource:p(g),MKey:"key"},null,8,["MTableColumns","MikuDataSource"]),F])}}});export{q as __pageData,D as default};
