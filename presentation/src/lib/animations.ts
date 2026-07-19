import { animate, createTimeline, stagger, type JSAnimation, type Timeline } from "animejs";

export function animatePreviewIn(target: HTMLElement): JSAnimation {
  return animate(target, {
    opacity: [0, 1],
    translateY: [22, 0],
    filter: ["blur(6px)", "blur(0px)"],
    duration: 640,
    ease: "out(3)",
  });
}

export function animateBusyPulse(target: HTMLElement): JSAnimation {
  return animate(target, {
    scale: [1, 0.965, 1],
    duration: 380,
    ease: "inOut(2)",
  });
}

export function animateThemeFlash(target: HTMLElement): Timeline {
  return createTimeline({ defaults: { ease: "out(2)" } })
    .add(target, { opacity: [1, 0.78], duration: 130 })
    .add(target, { opacity: 1, duration: 240 });
}

export function animateShellEnter(targets: Element | NodeListOf<Element> | Element[]): Timeline {
  const nodes = Array.from(targets as NodeListOf<Element> | Element[]);
  for (const node of nodes) {
    if (node instanceof HTMLElement) {
      node.style.opacity = "0";
    }
  }
  return createTimeline({ defaults: { ease: "out(3)" } }).add(nodes, {
    opacity: [0, 1],
    translateY: [18, 0],
    duration: 560,
    delay: stagger(70),
  });
}

export function animateFeedbackModal(input: {
  overlay: HTMLElement;
  card: HTMLElement;
  icon: HTMLElement;
  burst: HTMLElement | null;
  tone: "success" | "error";
}): Timeline {
  const timeline = createTimeline({ defaults: { ease: "out(3)" } });

  timeline.add(input.overlay, {
    opacity: [0, 1],
    duration: 280,
  });

  timeline.add(
    input.card,
    {
      opacity: [0, 1],
      translateY: [22, 0],
      scale: [0.94, 1],
      duration: 520,
    },
    "<<40",
  );

  if (input.tone === "success") {
    timeline.add(
      input.icon,
      {
        scale: [0.6, 1.12, 1],
        rotate: [-12, 0],
        duration: 620,
      },
      "<<120",
    );
    const check = input.icon.querySelector(".feedback-check");
    if (check instanceof SVGElement) {
      const length = 40;
      check.style.strokeDasharray = `${length}`;
      check.style.strokeDashoffset = `${length}`;
      timeline.add(
        check,
        {
          strokeDashoffset: [length, 0],
          duration: 420,
          ease: "out(2)",
        },
        "<<220",
      );
    }
  } else {
    timeline.add(
      input.icon,
      {
        scale: [0.7, 1.08, 1],
        duration: 480,
      },
      "<<100",
    );
    timeline.add(
      input.card,
      {
        translateX: [0, -8, 8, -5, 5, 0],
        duration: 420,
        ease: "inOut(2)",
      },
      "<<40",
    );
  }

  return timeline;
}

export function stopAnimation(animation: JSAnimation | Timeline | null | undefined): void {
  if (!animation) {
    return;
  }
  animation.pause();
  if ("revert" in animation && typeof animation.revert === "function") {
    animation.revert();
  }
}
