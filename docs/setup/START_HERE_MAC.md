# PriceWatch V12：Mac组员从这里开始

这是A的阶段版本，B和C在此基础上开发，不是最终提交版。

## 给AI的文件和任务

先给AI `PriceWatch_TEAM_AI_GUIDE.md`、`A_pricewatch_v12.json` 和本README，说明“我使用Mac，负责B/C，请按指南一步一步教我复现A，再开发我的模块”。需要核对数据时提供data目录。AI不一定能读取ZIP，先解压；大数据不必直接粘贴到聊天框。

## 包内文件

- A_pricewatch_v12.json：完整A流程及关联配置；只导入这一份，不另加早期补丁。
- data/：history和batches两份JSON，每行一个文档，保留MongoDB类型。
- pricewatch-groceries.jpg：初始页面图片。
- merchant-logos/：九家PNG商家标志及来源记录。
- PriceWatch_TEAM_AI_GUIDE.md：数据、界面、版本、分工和B/C开发顺序。
- verification/：离线数据、静态脚本检查结果；不是你Mac运行通过的证明。

## 在Mac上的顺序

1. 安装并启动适合自己芯片的Docker Desktop（Apple Silicon或Intel）。已有环境先检查，不重复创建同名容器。
2. 按团队指南建立两个容器、同一网络；安装Dashboard1.33.0及mongodb4节点3.4.0。
3. 新环境先导入数据库和图片，再导入并部署A，避免首次自动采集先产生不同批次。
4. 打开Terminal，输入`cd `后把解压得到的PriceWatch_V12_2026-10-20文件夹拖入终端，再回车。随后可直接使用下面的相对路径。
5. 首次导入空数据库执行下面的数据命令；已有数据不要直接重复执行，不要加--drop。

```sh
docker cp "data/pricewatch_history.json" comp7503-mongo:/tmp/pricewatch_history.json
docker cp "data/pricewatch_batches.json" comp7503-mongo:/tmp/pricewatch_batches.json
docker exec comp7503-mongo mongoimport --db comp7503 --collection pricewatch_history --file /tmp/pricewatch_history.json
docker exec comp7503-mongo mongoimport --db comp7503 --collection pricewatch_batches --file /tmp/pricewatch_batches.json
docker cp "pricewatch-groceries.jpg" comp7503-nodered:/data/pricewatch-groceries.jpg
docker cp "merchant-logos" comp7503-nodered:/data/pricewatch-merchant-logos
```

6. 在MongoDB检查日期类型、记录数量、成功批次及唯一索引。JSON不带索引；下面命令只创建核心唯一索引，若报重复键先排查已有数据，不删除真实数据。

```sh
docker exec comp7503-mongo mongosh --quiet --eval 'db.getSiblingDB("comp7503").pricewatch_history.createIndex({batchId:1,productCode:1,merchantCode:1},{unique:true,name:"batch_product_merchant_unique"})'
```

7. 浏览器访问http://localhost:1880，菜单→Import→选择A_pricewatch_v12.json。在新环境只导入一次。MongoDB主机是comp7503-mongo，不是localhost。Deploy。
8. 访问http://localhost:1880/dashboard/prices；搜索“牛奶”、选商品、检查报价和Logo、试翻页与无结果，再检查窄屏。初次类别为空时，在采集完成后点击A_Load Categories触发器。
9. 确认A可用后，新建自己的流程与页面：B为/categories，C为/history。共用PriceWatch的ui-base、主题和MongoDB连接，不再复制A。
10. 按团队指南第12或13节开发。完成功能后交回自己的流程与新增配置，再在一套整合环境联调；不是把三份含重复A的全量流程直接拼接。

## 数据注意事项

导入快照有73872条历史记录、3个批次；只登记了2个成功批次。最早未登记批次原样保留，不能自动加入有效历史。C先使用2个有效观察点搭建功能，数据不足时明确提示。A之后按香港自然日继续采集；各电脑不会自动同步，不需要A每天手动重发。

两个人都能先复现同一A基线，分别完成自己的模块；最终仍需三人联调按钮、路由、数据和样式。
