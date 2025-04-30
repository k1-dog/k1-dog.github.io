#!/usr/bin/env sh

# 忽略错误
set -e  #有错误抛出错误

# 构建
pnpm run build:eyes  #然后执行打包命令

# 进入待发布的目录
cd apps/eyes/.vitepress/dist  #进到dist目录

git init  #执行这些git命令
git add -A
git commit -m 'deploy'

git push -f https://github.com/k1-dog/k1-dog.github.io.git master:gh-pages  #提交到这个分支

cd -

rm -rf apps/eyes/.vitepress/dist  #删除dist文件夹