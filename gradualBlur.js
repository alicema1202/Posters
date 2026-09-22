// Ports the visual mechanism of the React Bits <GradualBlur /> component
// (github.com/ansh-dhanani) to plain HTML/CSS for use in the Puppeteer-rendered
// poster templates, which have no React runtime.

const CURVE_FUNCTIONS = {
    linear: (p) => p,
    bezier: (p) => p * p * (3 - 2 * p),
    "ease-in": (p) => p * p,
    "ease-out": (p) => 1 - Math.pow(1 - p, 2),
    "ease-in-out": (p) =>
        p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
};

const GRADIENT_DIRECTIONS = {
    top: "to top",
    bottom: "to bottom",
    left: "to left",
    right: "to right"
};

function renderGradualBlur({
    position = "bottom",
    height = "6rem",
    width,
    strength = 2,
    divCount = 5,
    exponential = false,
    curve = "linear",
    opacity = 1
} = {}) {

    const curveFunc = CURVE_FUNCTIONS[curve] || CURVE_FUNCTIONS.linear;
    const direction = GRADIENT_DIRECTIONS[position] || "to bottom";
    const isVertical = position === "top" || position === "bottom";

    const increment = 100 / divCount;

    let layers = "";

    for (let i = 1; i <= divCount; i++) {

        const progress = curveFunc(i / divCount);

        const blurValue = exponential
            ? Math.pow(2, progress * 4) * 0.0625 * strength
            : 0.0625 * (progress * divCount + 1) * strength;

        const p1 = Math.round((increment * i - increment) * 10) / 10;
        const p2 = Math.round(increment * i * 10) / 10;
        const p3 = Math.round((increment * i + increment) * 10) / 10;
        const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

        let gradient = `transparent ${p1}%, black ${p2}%`;
        if (p3 <= 100) gradient += `, black ${p3}%`;
        if (p4 <= 100) gradient += `, transparent ${p4}%`;

        const mask = `linear-gradient(${direction}, ${gradient})`;

        layers += `
                <div
                    class="gradual-blur-layer"
                    style="
                        -webkit-mask-image: ${mask};
                        mask-image: ${mask};
                        -webkit-backdrop-filter: blur(${blurValue.toFixed(3)}rem);
                        backdrop-filter: blur(${blurValue.toFixed(3)}rem);
                        opacity: ${opacity};
                    "
                ></div>`;

    }

    const containerStyle = isVertical
        ? `height: ${height}; width: ${width || "100%"}; ${position}: 0; left: 0; right: 0;`
        : `width: ${width || height}; height: 100%; ${position}: 0; top: 0; bottom: 0;`;

    return `
            <div class="gradual-blur gradual-blur-${position}" style="${containerStyle}">
                <div class="gradual-blur-inner">
                    ${layers}
                </div>
            </div>`;

}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { renderGradualBlur };
} else if (typeof window !== "undefined") {
    window.GradualBlur = { renderGradualBlur };
}
