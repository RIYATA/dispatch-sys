import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'dispatch.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    formId TEXT,
    customerName TEXT,
    phoneNumber TEXT,
    address TEXT,
    appointmentTime TEXT,
    submissionTime TEXT,
    status TEXT,
    cpName TEXT,
    teamId TEXT,
    priority TEXT DEFAULT 'Normal',
    feedback TEXT,
    isAccessControlEntry BOOLEAN,
    adminNote TEXT,
    points INTEGER DEFAULT 0,
    visitResult TEXT DEFAULT 'success',
    isCompetitorUser BOOLEAN DEFAULT 0,
    competitorSpending TEXT,
    conversionChance TEXT,
    isWeChatAdded BOOLEAN DEFAULT 0,
    isKeyPersonHome BOOLEAN DEFAULT 0,
    isHighValue BOOLEAN DEFAULT 0,
    hasOpportunity BOOLEAN DEFAULT 0,
    opportunityNotes TEXT,
    completedAt TEXT,
    isElderlyHome BOOLEAN DEFAULT 0,
    originalAppointmentTime TEXT,
    tags TEXT,
    projectName TEXT DEFAULT '合富明珠'
  );

  CREATE TABLE IF NOT EXISTS cps (
    id TEXT PRIMARY KEY,
    name TEXT,
    status TEXT DEFAULT 'Idle',
    currentTaskId TEXT,
    color TEXT
  );

  CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY,
    teamId TEXT,
    staffId TEXT,
    UNIQUE(teamId, staffId)
  );

  CREATE TABLE IF NOT EXISTS task_staff (
    id TEXT PRIMARY KEY,
    taskId TEXT,
    staffId TEXT,
    UNIQUE(taskId, staffId)
  );

  CREATE TABLE IF NOT EXISTS feedback_presets (
    id TEXT PRIMARY KEY,
    category TEXT,
    subcategory TEXT,
    content TEXT
  );
`);

// Migration helper
const addColumnIfNotExists = (table: string, column: string, type: string) => {
  const info = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
  const exists = info.some(col => col.name === column);
  if (!exists) {
    try {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
      console.log(`Added column ${column} to ${table}`);
    } catch (e) {
      console.error(`Failed to add column ${column} to ${table}:`, e);
    }
  }
};

// Migration: Add missing columns if they don't exist
try {
  const columns = db.prepare("PRAGMA table_info(tasks)").all() as any[];
  const columnNames = columns.map(c => c.name);

  if (!columnNames.includes('formId')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN formId TEXT").run();
  }
  if (!columnNames.includes('completedAt')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN completedAt TEXT").run();
  }
  if (!columnNames.includes('isKeyPersonHome')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN isKeyPersonHome BOOLEAN DEFAULT 0").run();
  }
  if (!columnNames.includes('isHighValue')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN isHighValue BOOLEAN DEFAULT 0").run();
  }
  if (!columnNames.includes('hasOpportunity')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN hasOpportunity BOOLEAN DEFAULT 0").run();
  }
  if (!columnNames.includes('opportunityNotes')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN opportunityNotes TEXT").run();
  }
  if (!columnNames.includes('isWeChatAdded')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN isWeChatAdded BOOLEAN DEFAULT 0").run();
  }
  if (!columnNames.includes('visitResult')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN visitResult TEXT DEFAULT 'success'").run();
  }
  if (!columnNames.includes('isCompetitorUser')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN isCompetitorUser BOOLEAN DEFAULT 0").run();
  }
  if (!columnNames.includes('competitorSpending')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN competitorSpending TEXT").run();
  }
  if (!columnNames.includes('conversionChance')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN conversionChance TEXT").run();
  }

  if (!columnNames.includes('isElderlyHome')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN isElderlyHome BOOLEAN DEFAULT 0").run();
  }
  if (!columnNames.includes('originalAppointmentTime')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN originalAppointmentTime TEXT").run();
  }
  if (!columnNames.includes('promotionPoints')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN promotionPoints INTEGER DEFAULT 0").run();
  }
  if (!columnNames.includes('newInstallPoints')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN newInstallPoints INTEGER DEFAULT 0").run();
  }
  if (!columnNames.includes('stockPoints')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN stockPoints INTEGER DEFAULT 0").run();
  }
  if (!columnNames.includes('carrierInfo')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN carrierInfo TEXT").run();
  }
  if (!columnNames.includes('residentCount')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN residentCount INTEGER DEFAULT 0").run();
  }
  if (!columnNames.includes('monthlySpending')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN monthlySpending TEXT").run();
  }
  if (!columnNames.includes('isCompanyBill')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN isCompanyBill BOOLEAN DEFAULT 0").run();
  }
  if (!columnNames.includes('competitorExpirationDate')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN competitorExpirationDate TEXT").run();
  }
  if (!columnNames.includes('isNonResident')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN isNonResident BOOLEAN DEFAULT 0").run();
  }
  if (!columnNames.includes('projectName')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN projectName TEXT DEFAULT '合富明珠'").run();
  }
  if (!columnNames.includes('tags')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN tags TEXT").run();
  }
  if (!columnNames.includes('teamId')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN teamId TEXT").run();
  }
  if (!columnNames.includes('isAccessControlEntry')) {
    db.prepare("ALTER TABLE tasks ADD COLUMN isAccessControlEntry BOOLEAN DEFAULT 0").run();
  }
} catch (error) {
  console.error('Migration error:', error);
}

// Seed CPs
const ensureCps = () => {
  const teams = [
    { name: '林海英, 梁丽华', color: 'bg-blue-600' },
    { name: '李锐英, 麦金凤', color: 'bg-sky-500' },
    { name: '江玉梅, 陈玲', color: 'bg-teal-500' },
    { name: '董莉, 李细英', color: 'bg-indigo-500' },
    // New teams requested
    { name: '李锐英, 麦伟杰', color: 'bg-sky-600' },
    { name: '林海英, 何中健', color: 'bg-blue-500' },
    { name: '梁丽华, 麦金凤', color: 'bg-purple-500' },
    { name: '杨巧连, 黄伟豪', color: 'bg-orange-500' }
  ];

  const checkStmt = db.prepare('SELECT id FROM cps WHERE name = ?');
  const insertStmt = db.prepare('INSERT INTO cps (id, name, status, color) VALUES (?, ?, ?, ?)');

  teams.forEach(team => {
    const existing = checkStmt.get(team.name);
    if (!existing) {
      insertStmt.run(crypto.randomUUID(), team.name, 'Idle', team.color);
      console.log(`Seeded CP team: ${team.name}`);
    }
  });
};

ensureCps();

const parseStaffNames = (teamName: string) => {
  return teamName
    .split(/[，,、/]/)
    .map(n => n.trim())
    .filter(Boolean);
};

const ensureStaffAndTeamMembers = () => {
  const teams = db.prepare('SELECT id, name FROM cps').all() as { id: string; name: string }[];
  const insertStaff = db.prepare('INSERT INTO staff (id, name) VALUES (?, ?)');
  const findStaff = db.prepare('SELECT id FROM staff WHERE name = ?');
  const insertTeamMember = db.prepare('INSERT OR IGNORE INTO team_members (id, teamId, staffId) VALUES (?, ?, ?)');

  teams.forEach(team => {
    const names = parseStaffNames(team.name);
    names.forEach(name => {
      let staff = findStaff.get(name) as { id: string } | undefined;
      if (!staff) {
        const staffId = crypto.randomUUID();
        insertStaff.run(staffId, name);
        staff = { id: staffId };
      }
      insertTeamMember.run(crypto.randomUUID(), team.id, staff.id);
    });
  });
};

ensureStaffAndTeamMembers();

// Seed Feedback Presets
const ensurePresets = () => {
  const count = db.prepare('SELECT COUNT(*) as count FROM feedback_presets').get() as { count: number };
  if (count.count > 0) return;

  const initialPresets = [
    { category: '服务受理', subcategory: '故障维修', content: '网络故障已排查，重启光猫后恢复正常使用。' },
    { category: '服务受理', subcategory: '故障维修', content: '更换室内受损线缆，当前网速测试已达标。' },
    { category: '服务受理', subcategory: '故障维修', content: '现场配置路由器参数，网络连接已完全恢复。' },
    { category: '服务受理', subcategory: '故障维修', content: '重做水晶头接口，线路连接目前非常稳定。' },
    { category: '服务受理', subcategory: '故障维修', content: '建议用户更换千兆路由器以获得更佳网速。' },
    { category: '服务受理', subcategory: '日常上门', content: '定期服务回访上门，检查光猫及路由运行正常。' },
    { category: '服务受理', subcategory: '日常上门', content: '日常维护上门，协助用户理顺室内杂乱线缆。' },
    { category: '服务受理', subcategory: '日常上门', content: '送装小礼物上门，回访用户对近期网速的评价。' },
    { category: '服务受理', subcategory: '日常上门', content: '日常巡检上门，优化用户WiFi信道，提升稳定性。' },
    { category: '服务受理', subcategory: '故障处理', content: '装维上门维修，排查发现皮线受损，现已修复。' },
    { category: '服务受理', subcategory: '故障处理', content: '上门处理故障，更换损坏的电源适配器，网络正常。' },
    { category: '服务受理', subcategory: '故障处理', content: '排查室内弱电箱，解决接触不良导致的频繁掉线。' },
    { category: '服务受理', subcategory: '故障处理', content: '现场测试下行速率，确认主干光纤正常，修复冷接头。' },
    { category: '服务受理', subcategory: '装宽带', content: '装维人员上门装宽带，完成布线并调测路由器。' },
    { category: '服务受理', subcategory: '装宽带', content: '新装用户，协助安装IPTV并演示高清选台操作。' },
    { category: '服务受理', subcategory: '装宽带', content: '宽带安装完成，现场测速达标，用户签字确认。' },
    { category: '服务受理', subcategory: '装宽带', content: '协助新装用户绑定小翼管家，交代使用注意事项。' },
    { category: '业务营销', subcategory: '成功办理', content: '成功推荐升级5G包，用户对此资费表示满意。' },
    { category: '业务营销', subcategory: '成功办理', content: '新办全屋WiFi业务，现场测试信号覆盖良好。' },
    { category: '业务营销', subcategory: '成功办理', content: '成功办理额外流量包，业务已即时生效处理。' },
    { category: '业务营销', subcategory: '成功办理', content: '用户升级千兆融合套餐，手续已在现场办结。' },
    { category: '业务营销', subcategory: '发现商机', content: '发现用户有监控需求，推荐办理天翼看家。' },
    { category: '业务营销', subcategory: '发现商机', content: '用户咨询FTTR组网，具备高价值业务潜力。' },
    { category: '业务营销', subcategory: '发现商机', content: '由于近期孩子上网课，及时推介了宽带提速。' },
    { category: '拒办原因', subcategory: '现状满意', content: '用户对现有套餐使用情况表示满意，暂无更改现状的意愿。' },
    { category: '拒办原因', subcategory: '现状满意', content: '反馈目前手机流量和通话分钟数均够用，不需要升级。' },
    { category: '拒办原因', subcategory: '现状满意', content: '用户习惯现有资费模式，对新推出的套餐持观望态度。' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '用户反馈套餐月费超出预算，更倾向于低门槛的资费方案。' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '对比当前消费水平，用户认为提速降费力度不足，决定暂不办理。' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '用户对价格较为敏感，希望能有针对老用户的专属折扣方案。' },
    { category: '拒办原因', subcategory: '内容太杂', content: '用户表示新套餐包含的内容过于繁杂，目前未能完全理解其优势。' },
    { category: '拒办原因', subcategory: '内容太杂', content: '对于流量、合约、赠送业务的组合感到困惑，反馈还是简单的资费更透明。' },
    { category: '拒办原因', subcategory: '内容太杂', content: '用户反馈没有精力研究复杂的资费细则，要求提供更直观的对比。' },
    { category: '拒办原因', subcategory: '已办竞品', content: '用户近期已办理了异网的宽带/宽带套餐，处于合约期内无法迁入。' },
    { category: '拒办原因', subcategory: '已办竞品', content: '反馈副卡或家人使用的是竞争对手套餐，为了全家桶优惠选择继续留存。' },
    { category: '拒办原因', subcategory: '已办竞品', content: '用户由于工作要求或特定优惠，目前主要使用异网号码。' },
    { category: '拒办原因', subcategory: '营销不信', content: '用户对“免费、优惠”等词汇存在抵触心理，认为可能存在后续隐性逻辑。' },
    { category: '拒办原因', subcategory: '营销不信', content: '由于此前有过类似的营销体验，用户对限时优惠的真实性持怀疑态度。' },
    { category: '拒办原因', subcategory: '营销不信', content: '反馈营销电话过多，对推销此类业务持防御及排斥情绪。' },
    { category: '拒办原因', subcategory: '担心陷阱', content: '用户担心套餐升级后有隐藏扣费，或涉及到长期的合约限制。' },
    { category: '拒办原因', subcategory: '担心陷阱', content: '反馈合同条款中关于违约金及取消比例的细节不明确，不敢轻易尝试。' },
    { category: '拒办原因', subcategory: '担心陷阱', content: '用户对流量超额后的阶梯收费标准表示忧虑，担心产生高额欠费。' },
    { category: '拒办原因', subcategory: '身份存疑', content: '由于是上门/电话推销，用户对工作人员的官方身份验证存在疑虑。' },
    { category: '拒办原因', subcategory: '身份存疑', content: '反馈担心是不法分子冒充电信业务员，故拒绝提供个人信息及办理。' },
    { category: '拒办原因', subcategory: '身份存疑', content: '用户坚持要求去营业厅现场确认，不接受非固定网点的现场办理。' },
    { category: '拒办原因', subcategory: '时间仓促', content: '上门沟通时用户正忙于家务/工作，表示目前无法静下心来了解业务。' },
    { category: '拒办原因', subcategory: '时间仓促', content: '由于赶时间出门，用户简短拒绝了沟通，建议换个时间联系。' },
    { category: '拒办原因', subcategory: '时间仓促', content: '反馈近期家中琐事较多，没有时间处理通信套餐相关的变更。' },
    { category: '拒办原因', subcategory: '品牌印象', content: '用户对本区域的信号覆盖或响应速度有负面评价，品牌忠忠诚度较低。' },
    { category: '拒办原因', subcategory: '品牌印象', content: '反馈周边邻居对电信服务的评价一般，因此对新业务尝试动力不足。' },
    { category: '拒办原因', subcategory: '品牌印象', content: '由于品牌调性或历史印象，用户对电信作为第一选择持保留意见。' },
    { category: '拒办原因', subcategory: '投诉未结', content: '用户此前反映的问题尚未得到圆满解决，负面情绪较大，拒绝任何推销。' },
    { category: '拒办原因', subcategory: '投诉未结', content: '反馈之前的宽带报障处理周期过长，对现有的管理水平表示不满。' },
    { category: '拒办原因', subcategory: '投诉未结', content: '用户由于资费误差或扣费争议正在申诉中，表示不处理好现状不谈新业务。' },
    { category: '拒办原因', subcategory: '需求极低', content: '用户手机仅用于接收验证码或极少量通话，现有最低配套餐已足够。' },
    { category: '拒办原因', subcategory: '需求极低', content: '反馈手机不怎么联网，日常都在WiFi环境下，对流量包完全没需求。' },
    { category: '拒办原因', subcategory: '需求极低', content: '属于纯保号用户，对任何增加支出的业务变更均不予考虑。' },
    { category: '问题痛点', subcategory: '网速不够', content: '现场实测网速仅为100M，建议用户提速至千兆。' },
    { category: '问题痛点', subcategory: '网速不够', content: '用户反馈网速慢，经测速确认未达标，需扩容。' },
    { category: '问题痛点', subcategory: '网速不够', content: '对比用户套餐带宽，实测值偏低，需排查线路。' },
    { category: '问题痛点', subcategory: 'Wifi穿透差', content: '用户反馈卧室WiFi穿透力差，信号仅有一格。' },
    { category: '问题痛点', subcategory: 'Wifi穿透差', content: '墙体过厚导致WiFi覆盖严重不足，建议加装从路由。' },
    { category: '问题痛点', subcategory: 'Wifi穿透差', content: '实测次卧存在信号盲区，现有WiFi穿透能力有限。' },
    { category: '问题痛点', subcategory: '流量不充裕', content: '用户手机流量经常超出，正在省着用，推荐升档。' },
    { category: '问题痛点', subcategory: '流量不充裕', content: '每月流量结余极少，用户担心超出扣费，需优化。' },
    { category: '问题痛点', subcategory: '流量不充裕', content: '用户语音通话分钟数不足，建议加入全家桶套餐。' },
    { category: '需求挖掘', subcategory: '安防需求', content: '用户有看家护院需求，成功推荐安装智能摄像头。' },
    { category: '需求挖掘', subcategory: '安防需求', content: '向用户演示天翼看家回放功能，用户对此很感兴趣。' },
    { category: '需求挖掘', subcategory: '儿童需求', content: '家长关注孩子安全，成功推荐办理智能儿童手表。' },
    { category: '需求挖掘', subcategory: '儿童需求', content: '用户为孩子网课需求，办理了小度智能屏等设备。' },
    { category: '需求挖掘', subcategory: '老人需求', content: '关注老人健康，推荐将智能血压计接入智慧家庭。' },
    { category: '需求挖掘', subcategory: '老人需求', content: '向用户介绍老人专用血压计，数据可同步至手机查看。' },
    { category: '跟进记录', subcategory: '考虑中', content: '用户目前还在考虑中，已备注下周再次回访。' },
    { category: '跟进记录', subcategory: '考虑中', content: '对比多种套餐方案，目前处于犹豫未决状态。' },
    { category: '跟进记录', subcategory: '考虑中', content: '表示需与家人商量，暂未在现场签署协议。' },
    { category: '跟进记录', subcategory: '后续服务', content: '承诺明日进行电话回访，关注用户网速情况。' },
    { category: '跟进记录', subcategory: '后续服务', content: '已成功添加用户微信，后续提供远程指导。' },
    { category: '跟进记录', subcategory: '后续服务', content: '引导用户加入社群，后续关注服务使用体验。' },
    { category: '拒办原因', subcategory: '现状满意', content: '客户对现有套餐满意，无更换意愿' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '客户认为套餐资费过高，超出预算' },
    { category: '拒办原因', subcategory: '内容太杂', content: '客户对套餐内容不理解，觉得复杂' },
    { category: '拒办原因', subcategory: '已办竞品', content: '客户近期已办理其他运营商套餐' },
    { category: '拒办原因', subcategory: '营销不信', content: '客户对 “免费升级”“限时优惠” 等营销话术不信任' },
    { category: '拒办原因', subcategory: '担心陷阱', content: '客户担心隐藏扣费或合同陷阱' },
    { category: '拒办原因', subcategory: '身份存疑', content: '客户对推销人员身份存疑，缺乏信任' },
    { category: '拒办原因', subcategory: '时间仓促', content: '客户时间匆忙，不愿详细沟通' },
    { category: '拒办原因', subcategory: '品牌印象', content: '客户对电信运营商品牌印象不佳' },
    { category: '拒办原因', subcategory: '投诉未结', content: '客户此前有过投诉未解决，心存不满' },
    { category: '拒办原因', subcategory: '需求极低', content: '客户仅需保号，无流量或通话需求' },
    { category: '拒办原因', subcategory: '需求极低', content: '客户当前套餐剩余流量 / 通话时长充足，暂无需调整' },
    { category: '拒办原因', subcategory: '已办竞品', content: '客户近期有转网规划，暂不考虑当前运营商的套餐' },
    { category: '拒办原因', subcategory: '内容太杂', content: '客户对套餐附带的增值业务（如视频会员、增值服务）不感兴趣' },
    { category: '拒办原因', subcategory: '现状满意', content: '客户使用需求变更（如更换设备后套餐不匹配），暂不适用当前套餐' },
    { category: '拒办原因', subcategory: '品牌印象', content: '客户听闻该套餐实际体验较差，不愿尝试办理' },
    { category: '拒办原因', subcategory: '营销不信', content: '客户此前办理过同类套餐踩坑，对该类型套餐抵触' },
    { category: '拒办原因', subcategory: '现状满意', content: '客户暂无通信消费升级需求，维持现有套餐即可' },
    { category: '拒办原因', subcategory: '担心陷阱', content: '客户对套餐的合约期 / 有效期过长存在顾虑' },
    { category: '拒办原因', subcategory: '营销不信', content: '客户反感主动推销，希望自主选择套餐' },
    { category: '拒办原因', subcategory: '内容太杂', content: '客户是老年用户，对新套餐的操作流程（如线上激活、业务变更）不熟悉，怕麻烦不愿更换' },
    { category: '拒办原因', subcategory: '现状满意', content: '客户使用家庭共享套餐，现有方案已覆盖全家需求，无需调整' },
    { category: '拒办原因', subcategory: '需求极低', content: '客户日常依赖固定 WiFi，流量使用极少，现有基础套餐完全够用' },
    { category: '拒办原因', subcategory: '需求极低', content: '客户认为新套餐的权益（如 5G 速率、漫游权限）对自身没用，没必要更换' },
    { category: '拒办原因', subcategory: '时间仓促', content: '客户近期处于外出 / 出差状态，无法配合办理套餐变更的线下流程' },
    { category: '拒办原因', subcategory: '担心陷阱', content: '客户不认可新套餐的计费方式（如按日计费、阶梯收费），觉得不够透明' },
    { category: '拒办原因', subcategory: '现状满意', content: '客户的旧设备不支持新套餐的高速网络（如 5G），更换套餐无实际意义' },
    { category: '拒办原因', subcategory: '现状满意', content: '客户习惯了现有套餐的扣费周期，不想改变当前消费节奏' },
    { category: '拒办原因', subcategory: '品牌印象', content: '客户受亲友的套餐负面反馈影响，对新套餐抵触' },
    { category: '拒办原因', subcategory: '担心陷阱', content: '客户处于现有套餐合约期内，担心更换会产生违约金' },
    { category: '拒办原因', subcategory: '需求极低', content: '客户是学生群体，寒暑假通信需求低，现有低价套餐已满足需求' },
    { category: '拒办原因', subcategory: '现状满意', content: '客户因工作常出国，现有套餐的国际漫游服务更适配，不愿更换' },
    { category: '拒办原因', subcategory: '营销不信', content: '客户曾遇到 “宣传与实际套餐不符” 的情况，不再相信新套餐的介绍' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '客户暂无增加通信支出的计划，维持现有低成本套餐' },
    { category: '拒办原因', subcategory: '投诉未结', content: '客户对运营商的客服响应速度不满，不愿办理新业务' },
    { category: '拒办原因', subcategory: '需求极低', content: '客户的通信需求临时减少（如居家办公减少外出通话），现有套餐已过剩' },
    { category: '拒办原因', subcategory: '担心陷阱', content: '客户觉得新套餐的合约绑定项过多（如强制绑定设备），不愿接受' },
    { category: '拒办原因', subcategory: '内容太杂', content: '客户此前办理套餐变更时流程繁琐，不想再经历类似过程' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '客户认为当前套餐的月费单价远超同档位其他运营商的类似套餐，性价比太低' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '客户觉得套餐内的流量 / 通话量虽多，但自己实际用不完，花高价买了用不上的资源，认为不划算' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '客户核算了年付 / 长期合约的总费用，觉得整体支出过高，超出自己的年度通信预算' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '客户是低消费群体（如学生、退休人员），固定月通信预算有限，现有套餐资费超出了自身支付能力' },
    { category: '拒办原因', subcategory: '担心陷阱', content: '客户发现套餐除基础资费外，还有隐性的增值业务默认扣费，叠加后实际支出比预期高很多' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '客户近期处于消费紧缩阶段（如待业、支出增加），暂时不愿承担较高的通信资费' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '客户觉得当前套餐资费比自己之前使用的旧套餐涨价幅度过大，无法接受价格上涨' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '客户认为使用流量卡、公共 WiFi 等替代方式的通信成本更低，没必要花高价办理套餐' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '客户是家庭套餐主账户，觉得全家共享套餐的总资费过高，拆分办理基础套餐更省钱' },
    { category: '拒办原因', subcategory: '现状满意', content: '客户只是短期停留本地（如出差、旅游），办理高价长期套餐不如临时卡 / 日租卡划算' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '客户对比了 “套餐资费 + 设备绑定” 的组合成本，觉得捆绑消费后的总支出过高' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '客户觉得套餐的资费梯度不合理（如升级一档资费涨幅太大），找不到适配自己需求的平价档位' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '老人退休后收入以固定退休金为主，每月通信预算有限，觉得套餐资费超出了自己的常规消费范围' },
    { category: '拒办原因', subcategory: '需求极低', content: '老人日常仅用套餐的基础通话功能，流量 / 增值服务几乎不用，认为高价套餐是 “花冤枉钱买用不上的东西”' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '老人对比自己早年使用的低价老年专项套餐，觉得当前套餐资费涨幅过高，无法适应价格变化' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '老人对套餐的 “资费 - 权益” 换算不清晰，只直观觉得月费数字比自己能接受的价格高，直接判定太贵' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '老人是家庭副卡用户，觉得主套餐分摊到自己的资费部分过高，不如单独办低价老年卡划算' },
    { category: '拒办原因', subcategory: '担心陷阱', content: '老人担心套餐除了明标资费外，还有自己看不懂的隐性扣费，叠加后实际支出会更高，因此觉得资费 “虚高不安全”' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '老人习惯了节俭的消费模式，认为通信属于 “刚需低价项”，高价套餐不符合自己的消费观念' },
    { category: '拒办原因', subcategory: '需求极低', content: '老人日常通话对象少（多是子女、老邻居），每月通话时长很短，高价套餐的资源完全过剩，觉得资费不值' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '老人听身边同龄亲友说某运营商的老年专属套餐更便宜，对比后觉得当前套餐资费没有优势' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '老人近期有其他生活支出增加（如医疗、养老开销），通信资费的小幅上涨也会让他觉得超出负担' },
    { category: '拒办原因', subcategory: '价格嫌贵', content: '老人对 “套餐升级后资费上涨” 的逻辑不理解，只看到月费变高，直接认为是 “变相加价”，不愿接受' },
    { category: '拒办原因', subcategory: '需求极低', content: '老人使用的是老年机，无法使用套餐内的流量、智能服务等权益，觉得花高价办套餐 “亏了”' },
    { category: '拒办原因', subcategory: '身份存疑', content: '老人对陌生人员上门催录门禁的行为高度警惕，怀疑对方不是正规运营商员工，担心是冒充身份的诈骗人员' },
    { category: '拒办原因', subcategory: '担心陷阱', content: '老人觉得催录门禁和套餐绑定是 “强制搭售”，警惕办理后会被偷偷升级高价套餐、增加额外资费' },
    { category: '拒办原因', subcategory: '担心陷阱', content: '老人警惕录门禁需要提供身份证、家庭住址等隐私信息，担心这些信息被泄露或用于其他违规用途' },
    { category: '拒办原因', subcategory: '担心陷阱', content: '催录门禁的节奏太急促，老人觉得 “事出反常必有妖”，警惕背后藏着隐藏合约、自动扣费等陷阱' },
    { category: '拒办原因', subcategory: '营销不信', content: '老人曾听过 “录门禁送套餐” 实则是长期合约陷阱的传闻，对此类捆绑推销的警惕性极高，怕被套牢' },
    { category: '拒办原因', subcategory: '担心陷阱', content: '老人担心录完门禁后，运营商会以此为借口频繁上门推销其他高价业务，不堪其扰' },
    { category: '拒办原因', subcategory: '担心陷阱', content: '老人对录门禁的操作流程完全不了解，警惕自己在不知情的情况下被诱导签署套餐变更协议，导致资费上涨' },
    { category: '拒办原因', subcategory: '身份存疑', content: '老人认为门禁录入是小区物业的职责，运营商主动催录不合常理，警惕这只是变相推销套餐的手段' },
    { category: '拒办原因', subcategory: '营销不信', content: '老人对 “录门禁免费升级套餐” 的话术不信任，觉得天上不会掉馅饼，警惕后续会以各种理由涨资费' },
    { category: '拒办原因', subcategory: '担心陷阱', content: '老人担心录门禁后，套餐会自动续约或升级，自己年纪大不懂如何取消，后续会产生高额不必要的费用' },
    { category: '拒办原因', subcategory: '担心陷阱', content: '老人看到催录门禁时还要求绑定银行卡代扣，警惕是为了套取支付信息，后续会莫名扣费' },
    { category: '拒办原因', subcategory: '身份存疑', content: '老人的子女反复叮嘱过要警惕上门推销，因此对催录门禁 + 套餐推荐的组合行为直接抵触，怕给家人添麻烦' },
  ];

  const stmt = db.prepare('INSERT INTO feedback_presets (id, category, subcategory, content) VALUES (?, ?, ?, ?)');
  const info = db.transaction(() => {
    initialPresets.forEach(p => {
      stmt.run(crypto.randomUUID(), p.category, p.subcategory, p.content);
    });
  })();
  console.log('Seeded feedback presets');
};

ensurePresets();

export default db;
