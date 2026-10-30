import { GameRoot } from './app/GameRoot'
import { Sandbox } from './dev/Sandbox'

export default function App() {
  const isDev = new URLSearchParams(window.location.search).has('dev')
  return isDev ? <Sandbox /> : <GameRoot />
}
