// 页面上所有视频都在这里配置，main.js 会按此渲染，无需改 HTML。
//
// 添加本地视频：
//   1. tools/prepare_video.sh <原视频> <name> [--duration 20 --speed 2]
//   2. 在下方对应 section 的 items（或 groups[].items）里加一条
//      { title, desc, src: "static/videos/<name>.mp4", poster: "static/images/posters/<name>.jpg", tags: [...] }
//
// 外链视频（大文件推荐）：把 src 换成以下任一字段即可
//   youtube:  "视频 ID"          例如 "dQw4w9WgXcQ"
//   bilibili: "BV 号"            例如 "BV1xx411c7mD"
//   url:      "任意可直链的 mp4"  例如对象存储 / CDN 地址
//
// 可选字段：wide: true 让卡片占满整行；speed: 2 让卡片内预览按 2 倍速播放。
// section.groups：在主列表之后追加带小标题的子分组（例如「早期实验」）。
// group.rows：在分组内再按行排布，每行一个独立网格；cols: 3 让该行固定 3 列并排，cols: 1 让该行只放一个居中卡片。

function v(name) {
  return { src: "static/videos/" + name + ".mp4", poster: "static/images/posters/" + name + ".jpg" };
}

function item(name, fields) {
  return Object.assign(v(name), fields);
}

window.PAGE_VIDEOS = {
  teaser: Object.assign(v("teaser"), {
    caption:
      "Closed-loop person following with online 3D perception, navigation in randomized and 3DGS scenes, " +
      "and dense 3D perception labels from the simulation data engine.",
  }),

  sections: [
    {
      id: "deploy",
      title: "Model Deployment",
      desc: "Trained policies running in closed loop.",
      items: [
        item("eval_person_track_3d_perception_hospital", {
          title: "Person following + 3D perception",
          desc: "Hospital scene. The model tracks the person while predicting 3D perception outputs online.",
          tags: ["drone", "person track", "3D perception"],
          wide: true,
        }),
        item("eval_person_track_hospital", {
          title: "Person following",
          desc: "Hospital scene. \u201cfollow the person along their path\u201d",
          tags: ["drone", "person track"],
        }),
        item("eval_nav_hospital", {
          title: "Instruction navigation",
          desc: "Hospital scene. \u201cHead forward, then turn right into the corridor and stop beside the hospital bed\u201d",
          tags: ["drone", "navigation"],
        }),
        item("eval_person_track_rl", {
          title: "Person following (RL)",
          desc: "Person-following policy trained with reinforcement learning.",
          tags: ["drone", "person track", "RL"],
        }),
      ],
      groups: [
        {
          title: "Early experiments",
          items: [
            item("eval_person_track_opentrackvla", {
              title: "Person following with OpenTrackVLA-0.6B",
              desc: "Early closed-loop test with the OpenTrackVLA-0.6B model.",
              tags: ["person track", "OpenTrackVLA"],
            }),
          ],
        },
      ],
    },
    {
      id: "data",
      title: "Data Engine",
      desc: "Large-scale, automatically labeled demonstrations generated in simulation.",
      items: [
        item("datagen_person_track_3d_perception_vis", {
          title: "Person following + 3D perception labels",
          desc: "Hospital scene. RGB with synchronized depth, semantic / instance masks, 2D and 3D boxes.",
          tags: ["person track", "3D perception"],
          wide: true,
        }),
        item("datagen_nav_3d_perception_vis", {
          title: "Navigation + 3D perception labels",
          desc: "Hospital scene. Same multi-channel labels recorded for instruction navigation episodes.",
          tags: ["navigation", "3D perception"],
          wide: true,
        }),
        item("datagen_person_track_grid", {
          title: "Person-following data diversity",
          desc: "Six episodes sampled from one batch: different routes, viewpoints and lighting.",
          tags: ["person track", "diversity"],
          wide: true,
        }),
        item("datagen_nav_random_room", {
          title: "Navigation in randomized scenes",
          desc: "Scene, layout and camera randomized per episode.",
          tags: ["navigation", "domain randomization"],
        }),
        item("datagen_person_track_random", {
          title: "Person following in randomized scenes",
          desc: "Person trajectory and follow geometry sampled per episode.",
          tags: ["person track", "domain randomization"],
        }),
      ],
      groups: [
        {
          title: "Early implementations",
          items: [
            item("datagen_nav_3dgs_scene", {
              title: "Navigation in a 3DGS scene",
              desc: "Navigation data rendered from a 3D Gaussian Splatting reconstruction.",
              tags: ["navigation", "3DGS"],
            }),
            item("datagen_nav_find_person_room", {
              title: "Find person",
              desc: "Search for and approach a person in an indoor room.",
              tags: ["navigation", "find person"],
            }),
          ],
          rows: [
            {
              cols: 3,
              items: [
                item("datagen_aloha_arm_pick_banana", {
                  title: "ALOHA manipulation: pick banana",
                  desc: "Generated manipulation demonstration.",
                  tags: ["robot arm", "ALOHA"],
                }),
                item("datagen_aloha_arm_pick_clock", {
                  title: "ALOHA manipulation: pick clock",
                  desc: "Generated manipulation demonstration.",
                  tags: ["robot arm", "ALOHA"],
                }),
                item("datagen_aloha_arm_pick_clock_v2", {
                  title: "ALOHA manipulation: pick clock",
                  desc: "Generated manipulation demonstration, second variant.",
                  tags: ["robot arm", "ALOHA"],
                }),
              ],
            },
            {
              cols: 1,
              items: [
                item("eval_pi05_aloha_arm_pick_banana", {
                  title: "\u03c00.5 deployment: pick banana",
                  desc: "\u03c00.5 policy trained on the generated data, deployment test.",
                  tags: ["robot arm", "\u03c00.5", "deployment"],
                  wide: true,
                }),
              ],
            },
          ],
        },
      ],
    },
  ],

  // 同步对比播放：左右两段视频共用一个播放 / 进度控制，适合「改进前 vs 改进后」。
  // 不需要时设为空数组即可隐藏该区块。
  compare: [
    // {
    //   title: "Baseline vs ours",
    //   desc: "Same episode, same instruction.",
    //   left: { label: "Baseline", src: "static/videos/cmp_baseline.mp4" },
    //   right: { label: "Ours", src: "static/videos/cmp_ours.mp4" },
    // },
  ],
};
