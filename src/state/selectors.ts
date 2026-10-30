import { atom } from 'jotai'
import { saveAtom, sessionAtom } from './atoms'
import {
  openCameras,
  availableTools,
  currentCat,
  isStageOpen,
  isGameComplete,
  worldState,
} from '../game/progression'

export const openCamerasAtom = atom((get) => openCameras(get(saveAtom).found))

export const availableToolsAtom = atom((get) => availableTools(get(saveAtom).found))

export const currentCatAtom = atom((get) => currentCat(get(saveAtom).found))

export const isStageOpenAtom = atom((get) => isStageOpen(get(saveAtom).found))

export const isGameCompleteAtom = atom((get) => isGameComplete(get(saveAtom).found))

export const dialogueAtom = atom((get) => get(sessionAtom).dialogue)

export const popupAtom = atom((get) => get(sessionAtom).popup)

export const hintAtom = atom((get) => get(sessionAtom).hint)

export const worldStateAtom = atom((get) => worldState(get(saveAtom), get(sessionAtom)))
