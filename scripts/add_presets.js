const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const db = new Database(path.join(__dirname, '..', 'dispatch.db'));

const newPresets = [
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
  { category: '拒办原因', subcategory: '身份存疑', content: '老人的子女反复叮嘱过要警惕上门推销，因此对催录门禁 + 套餐推荐的组合行为直接抵触，怕给家人添麻烦' }
];

const insertStmt = db.prepare('INSERT INTO feedback_presets (id, category, subcategory, content) VALUES (?, ?, ?, ?)');
const checkStmt = db.prepare('SELECT id FROM feedback_presets WHERE content = ?');

db.transaction(() => {
  newPresets.forEach(p => {
    const existing = checkStmt.get(p.content);
    if (!existing) {
      insertStmt.run(crypto.randomUUID(), p.category, p.subcategory, p.content);
      console.log(`Added: ${p.content}`);
    } else {
      console.log(`Skipped (exists): ${p.content}`);
    }
  });
})();

db.close();
