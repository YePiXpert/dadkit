# DadKit Task-Flow Information Architecture

## Goal

DadKit should feel like a dad-facing action app, not a collection of loosely related tools. The first information-architecture pass adopts a task-flow model: the home page answers what to do next, domain tabs handle their own core work, and the full tool/data directory lives under "我的".

## Confirmed Direction

Use **任务流优先**.

The mobile tab contract stays stable:

* 首页: status, next actions, labor mode, and a small set of frequent shortcuts.
* 清单: packing preparation, grouping, filtering, and checklist operations.
* 医院: hospital questions, admission requirements, and hospital-specific notes.
* 时间线: pregnancy-stage rhythm and task sequencing.
* 我的: profile, full tool directory, backups, app safety, and about.

## Page Responsibilities

### 首页

The home page is a cockpit. It should not become a full tool directory.

Keep:

* countdown and current pregnancy state
* strong `/go` entry
* "今天先做" rows
* overall preparation progress
* three high-frequency shortcuts

Move complete or lower-frequency tool discovery to `我的`.

### 清单

The checklist page is a packing workbench.

Keep visual grouping prominent. Keep filtering, mode switching, regenerate, reset, add item, timeline, go-mode, and copy-shopping-list actions together under a clear "清单操作" area so the top of the page remains about packing progress and category selection.

### 医院

The hospital page is for asking and recording hospital rules.

The first screen should prioritize:

* selected hospital
* confirmation progress
* the next questions to ask
* dad-action confirmations

Template selection, manual hospital-provided overrides, and custom hospital metadata remain advanced settings.

### 时间线

The timeline page is for rhythm and stages.

It should answer:

* which stage we are in
* what to do now
* what is coming later

It should not become a second tool directory. The `/go` CTA stays as a stage-related action.

### 我的

The "我的" page becomes the stable directory for:

* 我的资料
* 常用小工具
* 数据备份
* 应用与安全

This page can be denser than the other tabs because users visit it for management and recovery tasks, not urgent action.

## Implementation Scope

First implementation pass:

* Reorder and rename sections to match the page responsibilities above.
* Keep existing routes and local-first data contracts.
* Keep the five mobile tabs and existing secondary route ownership.
* Avoid introducing new APIs, stores, or data models unless needed for text or grouping.
* Preserve the current narrow `mobile-shell` layout and no-horizontal-overflow contract.

## Acceptance Criteria

* 首页 still contains the `/go` labor-mode entry.
* 首页 links to `settings#more-tools` for the complete tool directory.
* 清单 top hierarchy is progress then category selection, with bulk/filter actions grouped below.
* 医院 advanced template and override settings remain folded away from the primary question flow.
* 时间线 keeps a stage-first structure and does not add general tool-directory content.
* 我的 contains grouped sections for profile, tools, data backup, app/safety, and about.
* `MobileNav` route ownership remains unchanged.
* `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build` pass before completion.

## Out of Scope

* No account system.
* No remote database or realtime collaboration.
* No map SDK, location permission, or route-time calculation.
* No medical diagnosis or risk scoring.
* No full visual redesign beyond what is required for page hierarchy and grouping.
