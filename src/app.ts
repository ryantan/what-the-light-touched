export const STAGE_W = 1280
export const STAGE_H = 720

export function createStage(root: HTMLElement): HTMLElement {
  const frame = document.createElement('div')
  frame.id = 'frame'
  const stage = document.createElement('div')
  stage.id = 'stage'
  stage.style.width = `${STAGE_W}px`
  stage.style.height = `${STAGE_H}px`
  frame.append(stage)
  root.append(frame)
  const fit = () => {
    const s = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H)
    stage.style.transform = `scale(${s})`
  }
  window.addEventListener('resize', fit)
  fit()
  return stage
}
