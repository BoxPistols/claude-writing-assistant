import { locale } from '../locales';

const SAMPLES_EN = [
  {
    label: 'Business Email',
    text: `Dear Mr. Johnson,

I wanted to follow up on our conversation from last week regarding the Q3 marketing budget. After reviewing the numbers with our finance team, I beleive we can allocate an additional $50,000 towards digital advertising, which should help us reaching our target audience more effectively.

However, there is a few concerns I'd like to adress before we move forward. First, the ROI from last quarters social media campaigns was lower then expected. Second, we haven't yet established clear KPIs for the new initiaitves.

Could we schedule a meeting sometime next week to discuss these items further? I'm available Tuesday or Wednesday afternoon.

Best regards,
Sarah Chen`,
  },
  {
    label: 'Academic Essay',
    text: `The impacts of climate change on global agriculture is becoming increasingly apparent. Rising temperatures, changing precipitation patterns, and more frequent extreme weather events threatens food security for millions of people worldwide.

Research conducted by the IPCC suggests that crop yields could decline by up to 25% by 2050 if current trends continues. This decline would disproportionately effects developing nations, where agriculture accounts for a larger share of economic output and employment.

Furthermore, the interconnected nature of global food systems means that disruptions in one region can have far-reaching consequenses. For instance, a drought in major wheat-producing countries could lead to price spikes that affect consumers thousands of miles away.

Adaption strategies, such as developing drought-resistant crop varieties and improving irrigation effeciency, will be essential for mitigating these impacts.`,
  },
  {
    label: 'Creative Writing',
    text: `The old lighthouse stood at the edge of the cliff like a sentinal against the storm. It's walls, once painted a brilliant white, had been worn down to a patchy gray by decades of salt and wind. The iron railing along the walkway was thick with rust, and the glass panels of the lantern room was cracked and clouded.

Elena climbed the narrow spiral staircase, her footsteps echoed off the stone walls. She had came here every evening since she arrived in the village, drawn by something she couldn't quite explain. Maybe it was the way the setting sun turned the ocean into liquid gold, or maybe it was the silence — deep and absolute — that settled over everything like a blanket.

At the top, she pushed opened the heavy door and stepped out onto the platform. The wind immediately grabbed at her hair and coat. Below, waves was crashing against the rocks with a sound like thunder.`,
  },
];

const SAMPLES_JA = [
  {
    label: 'ビジネスメール',
    text: `田中部長

お疲れ様です。マーケティング部の佐藤です。

先日の会議でご相談いただいた第3四半期のマーケティング予算について、ファイナンスチームと検討いたしまた。デジタル広告に追加で500万円を配分することが可能であり、これによりターゲットオーデイエンスへのリーチを効果的に拡大できると考えてます。

ただし、進行にあたりいくつか懸念事があります。まず、前四半期のSNSキャンペーンのROIが予想を下まわりました。次に、新しい施策に対する明確なKPIがまだ設定されていません。

来週中にミーティングのお時間を頂けないでしようか。火曜日か水曜日の午後であれば対応可能です。

何卒よろしくお願い致します。
佐藤 美咲`,
  },
  {
    label: '学術レポート',
    text: `気候変動が世界の農業に与える影響はますます顕著になっている。気温の上昇、降水パターンの変化、及び極端な気象現象の頻発は、世界中の数百万人の食糧安全保証を脅かしている。

IPCCが実施した研究によると、現在の傾向が続けば、2050年までに作物の収穫量は最大25%減少する可能性がある。この減少は、農業が経済生産と雇用のより大きなシェアーを占める発展途上国に不均等に影響を及ぼす。

さらに、グローバルな食料システムの相互接続性は、ある地域での混乱が広範囲に渡る結果をもたらす事を意味する。例えば、主要な小麦生産国での干ばつは、数千キロ離れた消費者に影響を与える価格高等につながる可能性がある。

干ばつに強い作物品種の開発や灌漑効率の改善などの適応戦略は、これらの影響を緩和する為に不可決である。`,
  },
  {
    label: '物語文',
    text: `古い灯台は、嵐に対する番人のように崖の端に立っていた。かつて鮮やかな白に塗られたその壁は、数十年の塩と風によってまだらな灰色に摩耗していた。通路沿いの鉄の手すりは錆で厚くおおわれ、ランタン室のガラスパネルはひび割れて曇ていた。

エレナは狭い螺旋階段をのぼり、その足音は石の壁に反響した。彼女は村に到着してから毎晩ここに来ていて、自分でも説明できない何かにひかれていた。おそらくそれは沈む太陽が海を液体の金に変える様子かもしれないし、あるいは毛布のようにすべてを覆う、深くて完全な静けさかもしれなかった。

頂上で、彼女は重い扉を押しあけ、プラットフォームに足を踏み出した。風がただちに彼女の髪とコートを掴んだ。下では、波が雷のような音を立てて岩に打ちつけていた。`,
  },
];

export const SAMPLES = locale.startsWith('ja') ? SAMPLES_JA : SAMPLES_EN;
