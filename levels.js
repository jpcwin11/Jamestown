// Level definitions: each is a side-scrolling stage set in a real area of Chautauqua County, NY (1990s).
const LEVELS = [
  { name: "Downtown Jamestown", sub: "Main St & Third St", length: 2400, sky: ["#6fa8dc", "#cfe2f3"], ground: "#555",
    landmarks: [["Palace Theatre", 150, "#8b3a3a"], ["Lucille Ball Statue Plaza", 600, "#777"], ["Chadakoin Bldg", 1000, "#a0522d"],
      ["Gokey's", 1450, "#556b2f"], ["Hotel Jamestown", 1900, "#8a6d3b"]],
    waves: [[400, 2], [900, 3], [1500, 3], [2000, 4]], boss: { name: "Mill Foreman Moe", hp: 120 } },
  { name: "Jamestown High School", sub: "Fenton Pl campus", length: 2200, sky: ["#e69138", "#fce5cd"], ground: "#6b5b3e",
    landmarks: [["Red Raiders Gym", 200, "#8b0000"], ["Main Hall", 700, "#b5651d"], ["Football Field", 1200, "#2e7d32"], ["Bus Loop", 1800, "#c9a400"]],
    waves: [[400, 3], [900, 3], [1400, 4], [1850, 4]], boss: { name: "Coach Brutus", hp: 150 } },
  { name: "Foote Avenue", sub: "Down the hill", length: 2400, sky: ["#8e7cc3", "#d9d2e9"], ground: "#4a4a4a",
    landmarks: [["Corner Store", 250, "#7b4b94"], ["Foote Ave Diner", 800, "#c0392b"], ["Row Houses", 1300, "#607d8b"], ["Rail Yard", 1850, "#4e342e"]],
    waves: [[450, 3], [1000, 4], [1550, 4], [2050, 5]], boss: { name: "Big Tony", hp: 180 } },
  { name: "Lakewood, NY", sub: "Chautauqua Lake shore", length: 2500, sky: ["#4fc3f7", "#e1f5fe"], ground: "#6d6d5a",
    landmarks: [["Strip Mall", 200, "#8d6e63"], ["Lakewood Bowl", 750, "#3949ab"], ["Marina", 1300, "#0277bd"], ["Boat Launch", 1900, "#00838f"]],
    waves: [[450, 4], [1000, 4], [1600, 5], [2100, 5]], boss: { name: "Jet-Ski Jack", hp: 210 } },
  { name: "Chautauqua Institution", sub: "Amphitheater & gate", length: 2600, sky: ["#81c784", "#e8f5e9"], ground: "#8d7b5a",
    landmarks: [["Main Gate", 150, "#5d4037"], ["Athenaeum Hotel", 700, "#f5f5dc"], ["Amphitheater", 1300, "#795548"], ["Miller Bell Tower", 2000, "#9e9e9e"]],
    waves: [[450, 4], [1100, 5], [1700, 5], [2200, 6]], boss: { name: "The Chancellor", hp: 260 } }
];
if (typeof module !== "undefined") module.exports = LEVELS;
