const text = (en, zh) => ({ en, zh });

export const GAME_PHASE_COUNT = 5;

export function startingCircumstances(passenger) {
  const classContext = {
    1: text("an upper passenger deck", "上层乘客甲板"),
    2: text("a midship passenger corridor", "船中部乘客走廊"),
    3: text("a lower passenger deck", "下层乘客甲板"),
  }[passenger.pclass];
  const locationLabel = passenger.deck ? text(`Deck ${passenger.deck} (recorded cabin)`, `甲板 ${passenger.deck}（有船舱记录）`) : classContext;
  return {
    location: passenger.deck ? `deck-${passenger.deck.toLowerCase()}` : `class-${passenger.pclass}-area`,
    locationLabel,
    companions: passenger.isAlone ? "alone" : "together",
    minutesRemaining: 160,
    information: 0,
    access: passenger.pclass === 1 ? 2 : passenger.pclass === 2 ? 1 : 0,
    risk: 0,
    crowding: 0,
    deckLevel: passenger.pclass === 1 ? 2 : passenger.pclass === 2 ? 3 : 4,
    routeStatus: "uncertain",
    lifeboatAccess: "unknown",
    boarding: null,
  };
}

const movementDelay = (passenger) => passenger.pclass === 3 ? 7 : passenger.pclass === 2 ? 3 : 0;

export function sceneFor(state, passenger) {
  const hasFamily = !passenger.isAlone;
  const scenes = [
    {
      id: "impact",
      time: "14 APRIL · 11:45 PM",
      title: text("A vibration passes beneath the floor.", "一阵震动从地板下传来。"),
      body: text(`The corridor near ${state.locationLabel.en} is quiet. No general alarm has been announced.${hasFamily ? " Your travelling companions are nearby." : " You are travelling alone."}`, `${state.locationLabel.zh}附近的走廊很安静。尚未响起全船警报。${hasFamily ? "与你同行的人就在附近。" : "你独自旅行。"}`),
      choices: [
        ...(hasFamily ? [{ id: "wake-companions", label: text("Wake your companions and leave together", "叫醒同行者，一起离开"), effect: { minutes: -7, companions: "together", information: 1, location: "corridor" }, consequence: text("You leave together. The corridor offers no clear explanation, but no one in your party is left asleep.", "你们一起离开。走廊里仍没有明确解释，但同行者没有被独自留下。") }] : [{ id: "check-neighbours", label: text("Check the neighbouring corridor for information", "去相邻走廊了解情况"), effect: { minutes: -6, information: 1, location: "corridor" }, consequence: text("Other passengers are awake, but reports conflict. You are outside your cabin when movement begins.", "其他乘客已经醒来，但消息互相矛盾。人群开始移动时，你已在船舱外。") }]),
        { id: "investigate", label: text("Go upward to investigate the disturbance", "向上层走，查看震动原因"), effect: { minutes: -5 - movementDelay(passenger), information: 2, risk: 1, location: "stair-approach" }, consequence: text("You reach a busier passage and hear the first mention of ice. The route upward is clearer, but your party may not all be beside you.", "你来到更拥挤的通道，第一次听到有人提及冰山。向上的路线更清楚了，但同行者未必都在身边。") },
        { id: "wait", label: text("Remain where you are and wait for instructions", "留在原处等待指示"), effect: { minutes: -14, information: passenger.pclass === 1 ? 1 : 0, location: state.location }, consequence: text("Minutes pass before the danger becomes explicit. You followed the limited instructions available, but the ship is no longer quiet.", "几分钟过去，危险才变得明确。你遵从了当时有限的指示，但船上已不再安静。") },
      ],
    },
    {
      id: "warning",
      time: "15 APRIL · 12:05 AM",
      title: text("The corridor no longer feels ordinary.", "走廊里已不再平静。"),
      body: text("Passengers are dressing, asking questions, and moving in different directions. One crew member says there is no immediate danger; another points upward.", "乘客们开始穿衣、询问，并朝不同方向移动。一名船员说暂时没有危险，另一名则指向上层。"),
      choices: [
        { id: "follow-crew", label: text("Join the route indicated by the crew member", "加入船员所指的路线"), hint: text("A clearer destination, but the line is already growing", "目的地更明确，但队伍正在变长"), effect: { minutes: -11 - movementDelay(passenger), information: 1, access: 1, crowding: 1, location: "assembly-route", deckLevel: 3, routeStatus: "directed" }, consequence: text("You enter an organised stream toward an assembly area. It moves slowly, but you now have a destination.", "你进入一股前往集合区的有序人流。队伍移动缓慢，但你现在有了明确目的地。") },
        { id: "nearest-stairs", label: text("Take the nearest stairs without waiting", "不再等待，从最近的楼梯向上"), hint: text("Faster movement through an uncertain route", "移动更快，但路线未经确认"), effect: { minutes: -8 - movementDelay(passenger), information: 0, risk: 1, location: "upper-passage", deckLevel: 2, routeStatus: "self-directed" }, consequence: text("You gain a deck quickly. The landing branches in two directions, and neither is marked for lifeboats.", "你很快上升了一层。楼梯平台分向两边，却都没有救生艇标记。") },
        { id: hasFamily ? "check-party" : "ask-passengers", label: hasFamily ? text("Count your party before moving", "出发前确认同行者是否都在") : text("Ask other passengers what they have heard", "询问其他乘客听到了什么"), hint: hasFamily ? text("Keep the group intact at the cost of time", "保持同行者完整，但需要时间") : text("More reports, not necessarily more certainty", "信息更多，但未必更可靠"), effect: { minutes: -15, companions: hasFamily ? "together" : "group", information: 2, crowding: 1, location: "corridor", deckLevel: state.deckLevel, routeStatus: "delayed" }, consequence: hasFamily ? text("Everyone is accounted for. By the time you move, the corridor is much busier.", "所有人都已找到。等你们开始移动时，走廊已经拥挤许多。") : text("You hear three incompatible accounts. You are less isolated, but certainty has not improved.", "你听到了三种互相矛盾的说法。你不再孤立，但情况并未更清楚。") },
      ],
    },
    {
      id: "passage",
      time: "15 APRIL · 12:28 AM",
      title: text("The upward route narrows.", "向上的通道正在收窄。"),
      body: text("A companionway ahead is crowded. You can see movement above, but not whether the route reaches a loading station. The ship has begun to feel slightly off level.", "前方的升降梯通道已经拥挤。你能看到上层有人移动，却无法确认这条路是否通向登艇点。船体开始出现轻微倾斜。"),
      choices: [
        { id: "wait-companionway", label: text("Remain in the companionway queue", "留在升降梯通道的队伍中"), hint: text("Known direction, heavy congestion", "方向明确，但十分拥挤"), effect: { minutes: -18 - movementDelay(passenger), access: 1, crowding: 2, location: "upper-landing", deckLevel: 2, routeStatus: "congested" }, consequence: text("The queue eventually advances one deck. Many passengers behind you are now pressing toward the same landing.", "队伍最终向上移动了一层。身后越来越多的乘客正在挤向同一平台。") },
        { id: "service-stair", label: text("Try a quieter service stair", "尝试较安静的服务楼梯"), hint: text("Less crowded, destination unknown", "人少，但终点未知"), effect: { minutes: -11 - movementDelay(passenger), information: -1, risk: 2, crowding: -1, location: "service-stair", deckLevel: 2, routeStatus: "unverified" }, consequence: text("The stair is passable and quiet. It brings you upward, but farther aft than you expected.", "楼梯可以通行，也很安静。它把你带到上层，却比预想中更靠近船尾。") },
        { id: hasFamily ? "assist-party" : "hold-door", label: hasFamily ? text("Move at the pace of the slowest companion", "按照最慢同行者的速度前进") : text("Hold the passage for the group behind you", "为身后的人群撑住通道"), hint: text("Preserve the group; lose position", "维持人群完整，但会失去位置"), effect: { minutes: -22, companions: hasFamily ? "together" : "group", risk: 1, crowding: 1, location: "upper-landing", deckLevel: 2, routeStatus: "delayed" }, consequence: hasFamily ? text("Your party reaches the next landing together. Faster passengers have passed on both sides.", "你们一同到达下一处平台。更快的乘客已从两侧超过。") : text("The group passes through before the door swings back. You arrive after them, with less room ahead.", "人群在门回弹前通过。你最后到达，前方空间已经更少。") },
      ],
    },
    {
      id: "boat-deck",
      time: "15 APRIL · 12:52 AM",
      title: text("Cold air. Orders. A boat being lowered.", "冷空气、命令声，以及正在下降的救生艇。"),
      body: text("You emerge near the boat deck. One boat is loading nearby; another station across the deck appears less crowded, but you cannot see whether it is still accepting passengers.", "你来到救生艇甲板附近。一艘救生艇正在装载；甲板另一侧看起来人更少，但你无法确认那里是否仍在接纳乘客。"),
      choices: [
        { id: "nearest-queue", label: text("Enter the nearest loading line", "进入最近的登艇队伍"), hint: text("Immediate access, limited view of other stations", "机会就在眼前，但看不到其他装载点"), effect: { minutes: -10, access: 2, crowding: 2, location: "boat-deck", deckLevel: 0, lifeboatAccess: "near", boarding: "nearest" }, consequence: text("You reach the edge of an active loading area. The line is not orderly, and crew instructions change as the boat fills.", "你来到一个正在装载的区域边缘。队伍并不整齐，救生艇渐满时船员指示也在变化。") },
        { id: "observe-deck", label: text("Pause to understand which station is moving", "停下来观察哪一处装载点正在移动"), hint: text("Better information, fewer minutes", "信息更清楚，但时间更少"), effect: { minutes: -14, information: 2, access: 1, crowding: 0, location: "boat-deck", deckLevel: 0, lifeboatAccess: "observed", boarding: "observed" }, consequence: text("You identify one line that is still advancing. By the time you reach it, several groups have joined ahead of you.", "你确认了一条仍在移动的队伍。等你走到那里时，已有几组人排在前面。") },
        { id: "cross-deck", label: text("Cross toward the quieter station", "穿过甲板前往较安静的装载点"), hint: text("A different opportunity with no guarantee", "可能出现新机会，但没有保证"), effect: { minutes: -16, information: 1, access: 1, risk: 1, crowding: -1, location: "far-boat-deck", deckLevel: 0, lifeboatAccess: "far", boarding: "other-side" }, consequence: text("You leave the visible boat behind. The far station has more space around it, but its loading status is unclear.", "你离开了看得见的救生艇。远处装载点周围空间更大，但是否仍在装载并不清楚。") },
      ],
    },
    {
      id: "loading",
      time: "15 APRIL · AFTER 1:00 AM",
      title: text("A boarding call reaches your part of the deck.", "登艇呼叫传到了你所在的甲板区域。"),
      body: text(`${passenger.sex === "female" || (passenger.age !== null && passenger.age < 15) ? "The call appears to include passengers matching your recorded profile, but access is still contested." : "The call is selective, and you cannot tell whether it will include you."}${hasFamily ? " Your travelling party may not be admitted together." : " You have no recorded family member beside you."}`, `${passenger.sex === "female" || (passenger.age !== null && passenger.age < 15) ? "呼叫似乎包括与你记录特征相符的乘客，但通行机会仍存在争议。" : "登艇呼叫具有选择性，你无法确认自己是否会被允许登艇。"}${hasFamily ? "你的同行者可能无法同时获准。" : "记录中没有家人在你身边。"}`),
      choices: [
        { id: "present-party", label: text("Move forward when directed", "在得到指示时向前移动"), hint: text("Accept the crew's immediate decision", "接受船员此刻的安排"), effect: { minutes: -7, access: 2, location: "loading-gate", deckLevel: 0, boarding: "presented" }, consequence: text("You move to the loading boundary. The final decision is made under pressure, with no complete view of the ship.", "你来到装载边界。最终决定在压力下作出，没有人能够看清整艘船的情况。") },
        { id: "seek-opening", label: text("Look for an opening at the edge of the station", "在装载点边缘寻找空隙"), hint: text("A less direct position with greater uncertainty", "位置不直接，不确定性更高"), effect: { minutes: -11, access: 1, risk: 2, location: "loading-edge", deckLevel: 0, boarding: "edge" }, consequence: text("You reach the edge of the station as the boat's loading changes again. No place is guaranteed.", "你到达装载点边缘时，登艇情况再次发生变化。没有任何位置得到保证。") },
        { id: "keep-together-final", label: hasFamily ? text("Do not move unless your party can remain together", "除非同行者能一起行动，否则不向前") : text("Remain with the group beside you", "留在身边的人群中"), hint: hasFamily ? text("Protect the party; risk missing an individual place", "保护同行者，但可能错过个人位置") : text("Shared information, slower response", "共享信息，但反应更慢"), effect: { minutes: -15, companions: hasFamily ? "together" : "group", access: 0, risk: 1, location: "boat-deck", deckLevel: 0, boarding: "together" }, consequence: hasFamily ? text("You keep the party intact while individual places are offered and withdrawn around you.", "你让同行者保持完整，而周围的个人位置不断被提供又撤回。") : text("You remain with the group as the nearby loading decision moves on.", "你留在人群中，附近的登艇决定继续向前推进。") },
      ],
    },
  ];
  return scenes[state.phaseIndex] ?? null;
}
