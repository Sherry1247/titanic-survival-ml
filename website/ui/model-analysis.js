import { MODEL_REPORT } from "../data/model-results.js";

const percent = (value) => `${Math.round(value * 100)}%`;

function featureLabel(feature, lang) {
  const key = feature.replace(/^numeric__|^categorical__/g, "");
  const labels = {
    Pclass: ["Passenger class", "舱位等级"],
    Age: ["Age", "年龄"],
    SibSp: ["Siblings / spouse", "兄弟姐妹与配偶"],
    FamilySize: ["Family size", "家庭人数"],
    IsAlone: ["Travelling alone", "是否独自旅行"],
    Sex_female: ["Female", "女性"],
    Sex_male: ["Male", "男性"],
    Deck_U: ["Unknown deck", "未知甲板"],
    Deck_D: ["Deck D", "D层甲板"],
    Embarked_S: ["Southampton embarkation", "南安普敦登船"],
    Title_Mr: ["Title: Mr", "称谓：先生"],
    Title_Mrs: ["Title: Mrs", "称谓：夫人"],
    Title_Miss: ["Title: Miss", "称谓：小姐"],
    Title_Master: ["Title: Master", "称谓：小少爷"],
  };
  return labels[key]?.[lang === "zh" ? 1 : 0] ?? key.replaceAll("_", " ");
}

export function renderModelAnalysis({ container, result, passengers, lang }) {
  if (!result) {
    container.hidden = true;
    return;
  }

  const zh = lang === "zh";
  const selected = result.passengerIds
    .map((id) => passengers.find((passenger) => passenger.id === id))
    .filter(Boolean);
  const metrics = MODEL_REPORT.model.metrics;
  const data = MODEL_REPORT.dataset;

  container.hidden = false;
  container.innerHTML = `
    <div class="analysis-heading">
      <div>
        <span class="eyebrow">${zh ? "你的模型分析" : "YOUR MODEL ANALYSIS"}</span>
        <h2>${zh ? "决定之后，数据给出另一种视角。" : "After the decision, the data offers another lens."}</h2>
      </div>
      <p>${zh
        ? "以下概率来自本项目 Logistic Regression，对 891 条 Kaggle 训练记录进行固定随机种子划分后训练。概率描述数据关联，不等于命运，也不是因果解释。"
        : "These probabilities come from this project's Logistic Regression, trained on a deterministic split of 891 Kaggle records. They describe associations—not fate or causation."}</p>
    </div>
    <div class="model-metrics" aria-label="Model metrics">
      <article><span>Accuracy</span><strong>${percent(metrics.accuracy)}</strong><small>${zh ? "测试集准确率" : "holdout accuracy"}</small></article>
      <article><span>F1</span><strong>${metrics.f1.toFixed(3)}</strong><small>${zh ? "平衡查准率与召回率" : "precision / recall balance"}</small></article>
      <article><span>ROC–AUC</span><strong>${metrics.roc_auc.toFixed(3)}</strong><small>${zh ? "排序区分能力" : "ranking discrimination"}</small></article>
      <article><span>${zh ? "历史总体生存率" : "Historical survival"}</span><strong>${percent(data.survivalRate)}</strong><small>${MODEL_REPORT.trainingRows} ${zh ? "名乘客记录" : "passenger records"}</small></article>
    </div>
    <div class="decision-analysis">
      ${selected.map((passenger) => {
        const outcome = passenger.historicalOutcome === 1;
        return `
          <article class="analysis-passenger">
            <div class="analysis-passenger__top">
              <span class="analysis-avatar">${passenger.emoji}</span>
              <div><small>Kaggle #${passenger.passengerId}</small><h3>${passenger.name}</h3></div>
              <span class="outcome ${outcome ? "is-survived" : "is-lost"}">${outcome ? (zh ? "历史记录：生还" : "Historical: survived") : (zh ? "历史记录：未生还" : "Historical: did not survive")}</span>
            </div>
            <div class="probability-row">
              <div><span>${zh ? "模型预测生存概率" : "Model survival probability"}</span><strong>${percent(passenger.probability)}</strong></div>
              <div class="probability-track"><i style="width:${passenger.probability * 100}%"></i></div>
            </div>
            <dl class="profile-grid">
              <div><dt>${zh ? "性别" : "Sex"}</dt><dd>${passenger.sex === "female" ? (zh ? "女性" : "Female") : (zh ? "男性" : "Male")}</dd></div>
              <div><dt>${zh ? "舱位" : "Class"}</dt><dd>${passenger.pclass}</dd></div>
              <div><dt>${zh ? "年龄" : "Age"}</dt><dd>${passenger.age}</dd></div>
              <div><dt>${zh ? "家庭人数" : "Family"}</dt><dd>${passenger.familySize}</dd></div>
            </dl>
            <div class="factor-list">
              ${passenger.factors.map((factor) => {
                const positive = factor.impact >= 0;
                return `<span class="factor ${positive ? "is-positive" : "is-negative"}"><b>${positive ? "+" : "−"}</b>${featureLabel(factor.feature, lang)}</span>`;
              }).join("")}
            </div>
          </article>`;
      }).join("")}
    </div>
    <div class="data-context-grid">
      <article>
        <span class="eyebrow">${zh ? "数据中的群体差异" : "GROUP PATTERNS IN THE DATA"}</span>
        <h3>${zh ? "性别与舱位呈现显著相关性" : "Sex and class show strong associations"}</h3>
        <div class="rate-row"><span>${zh ? "女性" : "Female"}</span><i><b style="width:${data.femaleSurvivalRate * 100}%"></b></i><strong>${percent(data.femaleSurvivalRate)}</strong></div>
        <div class="rate-row"><span>${zh ? "男性" : "Male"}</span><i><b style="width:${data.maleSurvivalRate * 100}%"></b></i><strong>${percent(data.maleSurvivalRate)}</strong></div>
        ${Object.entries(data.classSurvivalRates).map(([group, rate]) => `<div class="rate-row"><span>${zh ? `${group}等舱` : `Class ${group}`}</span><i><b style="width:${rate * 100}%"></b></i><strong>${percent(rate)}</strong></div>`).join("")}
      </article>
      <article class="model-caveat">
        <span class="eyebrow">${zh ? "必须保留的边界" : "LIMITS THAT MATTER"}</span>
        <h3>${zh ? "模型无法重建那一夜。" : "The model cannot reconstruct that night."}</h3>
        <p>${zh
          ? `年龄字段缺失 ${percent(data.missingAgeRate)}，船舱字段缺失 ${percent(data.missingCabinRate)}。数据没有记录拥堵、舱门、船员命令、到达甲板的时间或每一次个人选择。`
          : `Age is missing for ${percent(data.missingAgeRate)} of records and cabin for ${percent(data.missingCabinRate)}. The data does not record congestion, locked passages, crew orders, arrival time, or every personal choice.`}</p>
      </article>
    </div>`;
}
