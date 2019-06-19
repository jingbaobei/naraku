﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿# Naraku  **适合BI和OA系统的状态管理及数据可视化工具包，非前端也可以尽快掌握的组件**  ***           好用记得点★一下######## 名称由来《犬夜叉》中的BOSS奈落（ならく）的英文拼写。######## 特性简介 1. 在MVVM模式中，负责model-model的关系管理和model到viewModel的数据格式转换。   2. 基于发布订阅模式的数据/状态/消息总线，可以代替Redux等状态管理工具。 3. “简单粗暴”一招鲜式的解决方案：  无论具体使用什么渲染框架，都采用同一套操作方式，降低学习成本。   4. 对BI系统三大常见操作：级联、过滤、分组-聚合有良好支持  。 5. 内置支持Vue和React（未来会支持Angular.js的...）。 6. 对echarts有良好支持。#### #### 安装： ``npm install naraku@latest --save --registry=https://registry.npmjs.org`` 或 `` yarn add naraku@latest --registry=https://registry.npmjs.org``从npm源安装最新版#### #### 引入： ```//  DataHub 和 $Transform 是 naraku 的两个核心组件import { DataHub,  $Transform } from 'naraku';```## ##  DataHub组件    DataHub是一种Store组件。########## 主要用途：      1. 数据级联自动请求数据      2. 用于保存全局上下文信息      3. 用于组件间的通讯######### DataHub设计思想简介 1. 视图是数据的表现，数据变化则视图变化， 数据变化则触发事件。   2. 对于选择，可以视为从候选数据集里抽取一个或几个值，放到选中数据集。   3. 对于级联，可以通过监听父数据中选中值得变化，作出响应，获取数据  ，无论多少级，只需考虑父数据的变化即可。我们可以把这种级联关系视为一种依赖，既子数据依赖于选中的父数据，并且进一步泛化为多个依赖。除了级联关系，还可以通过监听数据变化的方式，自定义数据关系。   4. 每一种组件体系（VUE、React等）都有自己的组件通信方式和上下文管理，并且往往不止一种方式，增加了学习难度，DataHub本身可作为全局通信总线，因此可以通过DataHub通信和传递上下文，无视各种眼花缭乱的方法。为了便于通信，DataHub支持方法注册，效果等同于组件暴露出的公有方法。######## DataHub和Radux、Rxjs的区别 0. Radux强调对动作的统一调度，对于DataHub来说，只有一个基本动作：更新数据并触发事件。 0. Rxjx强调数据的纵向流动管理，DataHub强调数据的横向关系管理。## #### 三级上下文思想```    Vue和React都有各自的上下文实现，但DataHub可以作为跨技术平台的通用实现，降低学习和开发成本。    DataHub默认将上下文分为三个级别：应用级、页面级、组件级。```   0. 当DataHub组件加载时，会自动创建一个全局实例，作为应用级上下文，可以通过DataHub.dh访问。 0. 声明页面级组件的时候，可以使用DataHub.inject作为修饰器，当组件实例化之后，创建DataHub实例，生命周期与组件相同（React是在componentWillMount阶段创建，Vue在created阶段创建）。  在组件中通过this.dh访问。同时创建一个Controller，通过this.dhController访问。默认的，也添加了全局dh的引用，并监听变化。可以同过this.gDh访问（gDh表示globalDataHub），同时gDh也创建一个Controller，通过gDhController访问。 0. 页面级组件可以通过props将自己的DataHub传递到子组件，当子组件得到DataHub实例后，可以通过datahub.bind(this)方法将父组件的datahub绑定。绑定后可以通过this.pDh（表示propsDataHub）访问， 同时会创建一个Controller，通过this.pDhController访问。若有必要，组件也可以使用DataHub.inject创建自己的DataHub实例，与父组件互不冲突。######Controller的作用顾名思义，Controller是一个控制器，有自己的生命周期，其主要作用管理数据和事件的监听的生命周期。当Controller销毁时，自动解除事件和数据的监听。通过inject和bind方法创建的Controller实例，与组件有相同的生命周期，当组件销毁时自动解除监听。（React是componentWillUnmount阶段，Vue是beforeDestroy阶段）######## 快速上手--在React中使用DataHub组件:```import React from 'react';import { DataHub } from 'naraku'; /*  示例场景：根据选中的省份，级联获取城市列表*//*==注册数据请求方法，在实际项目中通常是写在独立的文件中===*/// 获取省份列表APIDataHub.addFetcher('getProvince', (args)=>{  const {    param,  // 这个是请求参数，数据类型是Object    data, // 这个是提交的数据，数据类型是Array    form // 是否是表单数据集，数据类型Boolean } = args; // 实际项目中通常是异步请求数据  return [{name: '辽宁省'},{name: ‘浙江省’}];});// 获取城市列表APIDataHub.addFetcher('getCity', (args)=>{  const {    param,  // 这个是请求参数，数据类型是Object    data, // 这个是提交的数据，数据类型是Array    form // 是否是表单数据集，数据类型Boolean } = args;if (param.name === '辽宁省')  {  return [{name: '沈阳市'},{name: '大连市'}]}if (param.name === '浙江省')  {  return [{name: '杭州市'},{name: '宁波市'}]}  return []；});/*====================================*/// 通过DataHub.inject方法将DataHub注入到React组件中 （此方法也支持vue）@DataHub.inject({  // 参数是数据配置信息，用来配置数据直接的关系  // 获取城市列表  city: {  // city是数据集在DataHub中的名字     type:  'getCity',  // type是数据请求方法名     dependence: 'selectedProvince' // 依赖项：选中的省份，只有满足依赖后才会请求数据  },  // 获取省份列表  province: {  // province是数据集在DataHub中的名字    type:  'getProvince'      // 没有依赖项，因此当DataHub组件初始化以后自动请求数据  },  myData: { //  没有type，表示是本地数据    default: [{name: '张三'}]  //  default表示初始化数据  }})class NarakuDemo extends React.Component{  componentWillMount() {    // DataHub注入到React组件中，默认的变量名是dh（DataHub）;    console.log(this.dh);      // 同时生成的还有一个与组件生命周期相同的Controller，用于组件和dh的交互，当组件销毁时，Controller所有的方法失效    console.log(this.dhController);       // 读取数据集中的数据    console.log(this.dhController.get('myData'));   // 数据集中的数据将被统一封装成数组，读取不存在的数据集返回空数组    // 将数据写入数据集：选中的省份是浙江省，数据作为请求参数     this.dhController.set('selectedProvince', {name: '浙江省'}) // 此时满足了依赖条件DataHub请求数据，获取城市列表       // when函数用来监听数据集的数据变化，当数据变化时，触发回调,与事件不同的是如果在监听之前已有数据，将立即返回数据    this.dhController.when('city',  (data) => {      console.log(data)    });  } render() {  // 当数据和数据的状态发生变化时，自动重新渲染  console.log(this.dh.get('city));  //get等方法可以直接用dh对象调用  return null; }}```###### DataHub构造器参数（DataHub.inject参数）名称 | 说明|常见使用场景||------|--------|----|type |Fetcher名称，即DataHub.addFetcher名称，没有则表示是本地数据|从服务端得到的数据dependence|依赖数据集名称，可以是字符串或数组，没有type则无效|级联filter |过滤数据集名称，可以是字符串或数组，没有type则无效|查询条件pagination| 分页，是Boolean或object，没有type则无效|是否分页default |数据集的默认值|本地数据clear |当对应数据集变化时，清除本数据集|清除选中的值reset| 当对应数据集变化时，重置本数据集为default，若没有配置default，则清空|重置表单snapshot|当对应数据集变化时，做快照保存到本数据集|对结果有进一步操作，并可以回滚###### DataHub数据状态列表名称|含义|常见场景|-|-|-|undefined|未定义，数据集不存在或已删除|初始化时loading|数据集加载中|异步获取数据locked|数据集锁定|提交等场景，禁止操作数据set|数据可使用|读取渲染error|数据异常|获取数据出错###### Controller的API方法 | 说明| 返回值|常见使用场景|示例|------|------|--------|---|----|when | 监听数据|  function on | 监听事件|  functiononce | 一次性监听数据|  functionload    |   异步获取数据，若已有数据，则立即返回，类似once    |   undefined     |all | 类似when，区别是当参数为数组时只要所有数据更新才会触发回调 | function |fetch | 直接获取数据，不写入数据集 | promise |get| 读取数据集中的数据，若该数据集不存在，则返回空数组    | [] | 读取数用于展示的数据列表first|读取数据集中的第一条数据，若该数据不存在，则返回空对象   | {} | 读取全局状态/参数等数据refresh|   刷新数据集，重新请求数据（如果有type）| undefined | 提交表单后刷新列表submit|  提交数据| promise | 提交表单set|  写入数据| undefined | 操作数据assign0 | merge第一条数据，数据类型必须是Object       |   undefined      |  更新参数、状态delete     |  删除数据     |   undefined      | emit    |  发射事件     |  undefined       | 触发事件snapshot     |   数据快照    |  undefined       | 对数据进行操作之前用于还原的数据reset     |  重置数据集     |   undefined      | 表单重置status     |  获取/改变数据状态     |   string     | loading     |    是否是loading状态   |  boolean      |  显示或隐藏加载界面ready     | 是否是ready状态      |   boolean           | 初始数据是否可用hasRunner| 执行者函数是否存在   | boolean        |register | 注册执行函数| undefined | 组件通信，注册通信用函数run | 执行注册的函数| 注册函数的返回值| 组件通信，进行通信#### Transformer组件  Transformer组件用于将数据转变为页面显示需要的格式 ，核心特性是**分组聚合**运算  主要用于业务模型到视图模型以及视图模型之间的格式转换，基准数据格式为数组对象  ###### 快速上手--使用Transformer组件:```import { $Transform } from 'naraku';// 用$开头的含义是可以像jQuery那样连续调用// TODO ...```###方法 | 说明| 返回值|常见使用场景|示例|------|------|--------|---|----|fromObject | 从key-value结构转为对象数组| |适配不同组件toObject | 对象数组转为key-value结构| |适配不同组件toFields | 从对象数组的第一条数据中提取字段名| |提取table列名operate | 自定义操作map | Array的map操作| |同 Arrayfilter | Array的filter操作| |同 ArrayfromModel | 复杂模型转为数组对对象数组| |model转为view-model，便于展示fromMatrix | 二维数组转为对象数组| |适配不同组件toMatrix | 对象数组转为二维数组| |适配不同组件fromTree | 树形结构转为自连接关系对象数组| |适配树形组件toTree |关系型对象数组转为树结构| |适配树形组件toGrouped | 分组聚合| |忽略部分维度，将展示的维度聚合toSeries | echarts格式的分组聚合| |适配echartstoNumSeries |  echarts折线、柱形图格式的分组聚合| |适配echartstoPieSeries |echarts饼图格式的分组聚合| |适配echartstoHeatSeries |echarts热力图格式的分组聚合| |适配echartstoScatterSeries |echarts散点格式的分组聚合| |适配echartstoRadarSeries |echarts雷达图的分组聚合| |适配echartsgetData|获得转换后的数据getRefs|获得转换过程中生成的反射信息output|获得转换后的数据和生成的反射信息#### 常用工具方法 | 说明| 返回值|常见使用场景|示例|------|------|--------|---|----|noValue|判断值是否为null或undefined|Boolean| 值的非空判断blank| 空函数 | undefined |  作为默认回调函数blankNull| 空函数| null |  作为默认回调函数same|返回输入参数| any |  作为默认回调函数snapshot| JSON对象快照| object | 深克隆数据，避免浅克隆的问题localBaseUrl|返回当前URL| string | 用于请求数据paramToQuery|请求参数添加到URL后面|string|get请求upperCase0| 首字母大写 | string | 拼接单词并采用驼峰命名法NumberFormat.percent| 小数转为百分比|string | 格式化显示百分数NumberFormat.thsepar| 添加千位分隔符| string | 格式化显示长数字