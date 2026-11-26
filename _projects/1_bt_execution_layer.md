---
layout: page
title: "Autopilot-agnostic Behavior Trees"
description: "One Behavior Tree, any autopilot: execution layer with built-in emergency handling (JINT 2026)."
importance: 1
category: research
related_publications: false
---

One Behavior Tree, any autopilot. This modular execution layer lets the same mission tree run unchanged on DJI (Onboard SDK) and PX4/ArduPilot (MAVROS) platforms, with prioritized emergency handling for collision risk, low battery, GPS loss and flight anomalies.

- Validated in SITL, HITL and in the field on a DJI Matrice 300 RTK.
- Runs at 10 Hz using 6.3% of one CPU core and 33 MB of RAM.
- Later ported to ROS 2 with PX4 and Crazyflie backends.

**Paper:** [Journal of Intelligent & Robotic Systems, 2026](https://doi.org/10.1007/s10846-026-02367-z)
