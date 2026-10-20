import { app } from 'electron'

type DesktopLocale = 'en' | 'zh' | 'zh-TW' | 'ja' | 'ko' | 'fr' | 'es' | 'de' | 'pt'

type TranslationKey =
  | 'tray.show'
  | 'tray.hide'
  | 'tray.resetLogin'
  | 'tray.openAtLogin'
  | 'tray.openAtLoginFailedTitle'
  | 'tray.openAtLoginFailedMessage'
  | 'tray.quit'
  | 'desktop.startingLocalServices'
  | 'desktop.failedPrepareRuntime'
  | 'desktop.failedStartServices'
  | 'desktop.shuttingDown'
  | 'runtime.migrating'
  | 'runtime.verifyingBundled'
  | 'runtime.extractingBundled'
  | 'runtime.ready'
  | 'runtime.localRequired'
  | 'common.ok'
  | 'common.cancel'
  | 'browser.selectElement'
  | 'browser.selectRegion'
  | 'loginReset.confirmTitle'
  | 'loginReset.confirmMessage'
  | 'loginReset.confirmDetail'
  | 'loginReset.resetting'
  | 'loginReset.successTitle'
  | 'loginReset.successMessage'
  | 'loginReset.failedTitle'
  | 'loginReset.failedMessage'

const supportedLocales: DesktopLocale[] = ['en', 'zh', 'zh-TW', 'ja', 'ko', 'fr', 'es', 'de', 'pt']

const translations: Record<DesktopLocale, Record<TranslationKey, string>> = {
  en: {
    'tray.show': 'Show Studio',
    'tray.hide': 'Hide Studio',
    'tray.resetLogin': 'Reset Login',
    'tray.openAtLogin': 'Open at Login',
    'tray.openAtLoginFailedTitle': 'Could not change Open at Login',
    'tray.openAtLoginFailedMessage': 'The startup setting could not be saved. Check access to your startup configuration and try again.',
    'tray.quit': 'Quit Studio',
    'desktop.startingLocalServices': 'Starting local services...',
    'desktop.failedPrepareRuntime': 'Failed to prepare Studio runtime',
    'desktop.failedStartServices': 'Failed to start local services',
    'desktop.shuttingDown': 'Closing local services...',
    'runtime.migrating': 'Copying Runtime and downloaded Web UI versions to the selected storage directory...',
    'runtime.verifyingBundled': 'Verifying the bundled runtime...',
    'runtime.extractingBundled': 'Preparing the local runtime. The first launch may take a moment...',
    'runtime.ready': 'Studio runtime ready.',
    'runtime.localRequired': 'A local Studio runtime is required. Automatic runtime downloads are disabled in Studio.',
    'common.ok': 'OK',
    'common.cancel': 'Cancel',
    'browser.selectElement': 'Select DOM element',
    'browser.selectRegion': 'Select region',
    'loginReset.confirmTitle': 'Reset login',
    'loginReset.confirmMessage': 'Reset the login to admin / 123456?',
    'loginReset.confirmDetail': 'Studio will restart its local Web UI service, clear login locks, and return to the login page.',
    'loginReset.resetting': 'Resetting login...',
    'loginReset.successTitle': 'Login reset',
    'loginReset.successMessage': 'Login has been reset to {username} / {password}.',
    'loginReset.failedTitle': 'Login reset failed',
    'loginReset.failedMessage': 'Could not reset the desktop login.',
  },
  zh: {
    'tray.show': '显示 Studio',
    'tray.hide': '隐藏 Studio',
    'tray.resetLogin': '重置登录',
    'tray.openAtLogin': '开机启动',
    'tray.openAtLoginFailedTitle': '无法更改开机启动设置',
    'tray.openAtLoginFailedMessage': '无法保存开机启动设置，请检查自启动配置的访问权限后重试。',
    'tray.quit': '退出 Studio',
    'desktop.startingLocalServices': '正在启动本地服务...',
    'desktop.failedPrepareRuntime': '准备 Studio 运行时失败',
    'desktop.failedStartServices': '启动本地服务失败',
    'desktop.shuttingDown': '正在关闭本地服务...',
    'runtime.migrating': '正在将 Runtime 和已下载的 Web UI 版本迁移到所选存储目录...',
    'runtime.verifyingBundled': '正在校验内置运行环境...',
    'runtime.extractingBundled': '正在准备本地运行环境，首次启动可能稍需等待...',
    'runtime.ready': 'Studio 运行时已就绪。',
    'runtime.localRequired': '需要本机已安装的 Studio 运行时。Studio 已停用自动下载运行时。',
    'common.ok': '确定',
    'common.cancel': '取消',
    'browser.selectElement': '选择 DOM 元素',
    'browser.selectRegion': '框选区域',
    'loginReset.confirmTitle': '重置登录',
    'loginReset.confirmMessage': '确认将登录重置为 admin / 123456？',
    'loginReset.confirmDetail': 'Studio 会重启本地 Web UI 服务、清除登录失败锁，然后回到登录页。',
    'loginReset.resetting': '正在重置登录...',
    'loginReset.successTitle': '登录已重置',
    'loginReset.successMessage': '登录已重置为 {username} / {password}。',
    'loginReset.failedTitle': '重置登录失败',
    'loginReset.failedMessage': '无法重置桌面端登录。',
  },
  'zh-TW': {
    'tray.show': '顯示 Studio',
    'tray.hide': '隱藏 Studio',
    'tray.resetLogin': '重置登入',
    'tray.openAtLogin': '開機啟動',
    'tray.openAtLoginFailedTitle': '無法變更開機啟動設定',
    'tray.openAtLoginFailedMessage': '無法儲存開機啟動設定，請檢查自動啟動設定的存取權限後重試。',
    'tray.quit': '結束 Studio',
    'desktop.startingLocalServices': '正在啟動本地服務...',
    'desktop.failedPrepareRuntime': '準備 Studio 運行時失敗',
    'desktop.failedStartServices': '啟動本地服務失敗',
    'desktop.shuttingDown': '正在關閉本地服務...',
    'runtime.migrating': '正在將 Runtime 和已下載的 Web UI 版本遷移至所選儲存目錄...',
    'runtime.verifyingBundled': '正在驗證內建執行環境...',
    'runtime.extractingBundled': '正在準備本機執行環境，首次啟動可能需要稍候...',
    'runtime.ready': 'Studio 運行時已就緒。',
    'runtime.localRequired': '需要本機已安裝的 Studio 執行環境。Studio 已停用自動下載執行環境。',
    'common.ok': '確定',
    'common.cancel': '取消',
    'browser.selectElement': '選擇 DOM 元素',
    'browser.selectRegion': '框選區域',
    'loginReset.confirmTitle': '重置登入',
    'loginReset.confirmMessage': '確認將登入重置為 admin / 123456？',
    'loginReset.confirmDetail': 'Studio 會重新啟動本地 Web UI 服務、清除登入失敗鎖，然後回到登入頁。',
    'loginReset.resetting': '正在重置登入...',
    'loginReset.successTitle': '登入已重置',
    'loginReset.successMessage': '登入已重置為 {username} / {password}。',
    'loginReset.failedTitle': '重置登入失敗',
    'loginReset.failedMessage': '無法重置桌面端登入。',
  },
  ja: {
    'tray.show': 'Studio を表示',
    'tray.hide': 'Studio を隠す',
    'tray.resetLogin': 'Reset Login',
    'tray.openAtLogin': 'ログイン時に開く',
    'tray.openAtLoginFailedTitle': 'ログイン時の起動設定を変更できません',
    'tray.openAtLoginFailedMessage': '起動設定を保存できませんでした。自動起動設定へのアクセス権限を確認して再試行してください。',
    'tray.quit': 'Studio を終了',
    'desktop.startingLocalServices': 'ローカルサービスを起動しています...',
    'desktop.failedPrepareRuntime': 'Studio ランタイムの準備に失敗しました',
    'desktop.failedStartServices': 'ローカルサービスの起動に失敗しました',
    'desktop.shuttingDown': 'ローカルサービスを終了しています...',
    'runtime.migrating': 'Runtime とダウンロード済み Web UI を選択した保存先へ移行しています...',
    'runtime.verifyingBundled': '同梱の実行環境を検証しています...',
    'runtime.extractingBundled': 'ローカルの実行環境を準備しています。初回起動には少し時間がかかる場合があります...',
    'runtime.ready': 'Studio ランタイムの準備ができました。',
    'runtime.localRequired': 'ローカルの Studio ランタイムが必要です。Studio ではランタイムの自動ダウンロードは無効です。',
    'common.ok': 'OK',
    'common.cancel': 'Cancel',
    'browser.selectElement': 'DOM 要素を選択',
    'browser.selectRegion': '領域を選択',
    'loginReset.confirmTitle': 'Reset login',
    'loginReset.confirmMessage': 'Reset the login to admin / 123456?',
    'loginReset.confirmDetail': 'Studio will restart its local Web UI service, clear login locks, and return to the login page.',
    'loginReset.resetting': 'Resetting login...',
    'loginReset.successTitle': 'Login reset',
    'loginReset.successMessage': 'Login has been reset to {username} / {password}.',
    'loginReset.failedTitle': 'Login reset failed',
    'loginReset.failedMessage': 'Could not reset the desktop login.',
  },
  ko: {
    'tray.show': 'Studio 표시',
    'tray.hide': 'Studio 숨기기',
    'tray.resetLogin': 'Reset Login',
    'tray.openAtLogin': '로그인 시 열기',
    'tray.openAtLoginFailedTitle': '로그인 시 시작 설정을 변경할 수 없습니다',
    'tray.openAtLoginFailedMessage': '시작 설정을 저장할 수 없습니다. 자동 시작 설정에 대한 접근 권한을 확인한 후 다시 시도하세요.',
    'tray.quit': 'Studio 종료',
    'desktop.startingLocalServices': '로컬 서비스를 시작하는 중...',
    'desktop.failedPrepareRuntime': 'Studio 런타임 준비 실패',
    'desktop.failedStartServices': '로컬 서비스 시작 실패',
    'desktop.shuttingDown': '로컬 서비스를 종료하는 중...',
    'runtime.migrating': 'Runtime과 다운로드된 Web UI를 선택한 저장 디렉터리로 이동하는 중...',
    'runtime.verifyingBundled': '내장된 실행 환경을 확인하는 중...',
    'runtime.extractingBundled': '로컬 실행 환경을 준비하는 중입니다. 처음 실행할 때는 잠시 기다려 주세요...',
    'runtime.ready': 'Studio 런타임이 준비되었습니다.',
    'runtime.localRequired': '로컬 Studio 런타임이 필요합니다. Studio에서는 런타임 자동 다운로드가 비활성화되어 있습니다.',
    'common.ok': '확인',
    'common.cancel': 'Cancel',
    'browser.selectElement': 'DOM 요소 선택',
    'browser.selectRegion': '영역 선택',
    'loginReset.confirmTitle': 'Reset login',
    'loginReset.confirmMessage': 'Reset the login to admin / 123456?',
    'loginReset.confirmDetail': 'Studio will restart its local Web UI service, clear login locks, and return to the login page.',
    'loginReset.resetting': 'Resetting login...',
    'loginReset.successTitle': 'Login reset',
    'loginReset.successMessage': 'Login has been reset to {username} / {password}.',
    'loginReset.failedTitle': 'Login reset failed',
    'loginReset.failedMessage': 'Could not reset the desktop login.',
  },
  fr: {
    'tray.show': 'Afficher Studio',
    'tray.hide': 'Masquer Studio',
    'tray.resetLogin': 'Reset Login',
    'tray.openAtLogin': 'Ouvrir a la connexion',
    'tray.openAtLoginFailedTitle': 'Impossible de modifier le démarrage à la connexion',
    'tray.openAtLoginFailedMessage': 'Impossible d’enregistrer ce réglage. Vérifiez les droits d’accès à votre configuration de démarrage et réessayez.',
    'tray.quit': 'Quitter Studio',
    'desktop.startingLocalServices': 'Demarrage des services locaux...',
    'desktop.failedPrepareRuntime': 'Echec de la preparation du runtime Studio',
    'desktop.failedStartServices': 'Echec du demarrage des services locaux',
    'desktop.shuttingDown': 'Fermeture des services locaux...',
    'runtime.migrating': 'Migration du Runtime et des versions Web UI vers le repertoire selectionne...',
    'runtime.verifyingBundled': 'Vérification de l’environnement d’exécution intégré...',
    'runtime.extractingBundled': 'Préparation de l’environnement d’exécution local. Le premier démarrage peut prendre un moment...',
    'runtime.ready': 'Runtime Studio pret.',
    'runtime.localRequired': 'Un runtime Studio local est requis. Le téléchargement automatique est désactivé dans Studio.',
    'common.ok': 'OK',
    'common.cancel': 'Cancel',
    'browser.selectElement': 'Sélectionner un élément DOM',
    'browser.selectRegion': 'Sélectionner une zone',
    'loginReset.confirmTitle': 'Reset login',
    'loginReset.confirmMessage': 'Reset the login to admin / 123456?',
    'loginReset.confirmDetail': 'Studio will restart its local Web UI service, clear login locks, and return to the login page.',
    'loginReset.resetting': 'Resetting login...',
    'loginReset.successTitle': 'Login reset',
    'loginReset.successMessage': 'Login has been reset to {username} / {password}.',
    'loginReset.failedTitle': 'Login reset failed',
    'loginReset.failedMessage': 'Could not reset the desktop login.',
  },
  es: {
    'tray.show': 'Mostrar Studio',
    'tray.hide': 'Ocultar Studio',
    'tray.resetLogin': 'Reset Login',
    'tray.openAtLogin': 'Abrir al iniciar sesion',
    'tray.openAtLoginFailedTitle': 'No se pudo cambiar el inicio automático',
    'tray.openAtLoginFailedMessage': 'No se pudo guardar el ajuste. Comprueba los permisos de acceso a la configuración de inicio y vuelve a intentarlo.',
    'tray.quit': 'Salir de Studio',
    'desktop.startingLocalServices': 'Iniciando servicios locales...',
    'desktop.failedPrepareRuntime': 'No se pudo preparar el runtime de Studio',
    'desktop.failedStartServices': 'No se pudieron iniciar los servicios locales',
    'desktop.shuttingDown': 'Cerrando servicios locales...',
    'runtime.migrating': 'Moviendo Runtime y las versiones Web UI al directorio seleccionado...',
    'runtime.verifyingBundled': 'Verificando el entorno de ejecución incluido...',
    'runtime.extractingBundled': 'Preparando el entorno de ejecución local. El primer inicio puede tardar un momento...',
    'runtime.ready': 'Runtime de Studio listo.',
    'runtime.localRequired': 'Se requiere un runtime Studio local. Las descargas automáticas están desactivadas en Studio.',
    'common.ok': 'Aceptar',
    'common.cancel': 'Cancel',
    'browser.selectElement': 'Seleccionar elemento DOM',
    'browser.selectRegion': 'Seleccionar región',
    'loginReset.confirmTitle': 'Reset login',
    'loginReset.confirmMessage': 'Reset the login to admin / 123456?',
    'loginReset.confirmDetail': 'Studio will restart its local Web UI service, clear login locks, and return to the login page.',
    'loginReset.resetting': 'Resetting login...',
    'loginReset.successTitle': 'Login reset',
    'loginReset.successMessage': 'Login has been reset to {username} / {password}.',
    'loginReset.failedTitle': 'Login reset failed',
    'loginReset.failedMessage': 'Could not reset the desktop login.',
  },
  de: {
    'tray.show': 'Studio anzeigen',
    'tray.hide': 'Studio ausblenden',
    'tray.resetLogin': 'Reset Login',
    'tray.openAtLogin': 'Beim Anmelden offnen',
    'tray.openAtLoginFailedTitle': 'Autostart konnte nicht geändert werden',
    'tray.openAtLoginFailedMessage': 'Die Einstellung konnte nicht gespeichert werden. Prüfen Sie die Zugriffsrechte für Ihre Autostart-Konfiguration und versuchen Sie es erneut.',
    'tray.quit': 'Studio beenden',
    'desktop.startingLocalServices': 'Lokale Dienste werden gestartet...',
    'desktop.failedPrepareRuntime': 'Studio Runtime konnte nicht vorbereitet werden',
    'desktop.failedStartServices': 'Lokale Dienste konnten nicht gestartet werden',
    'desktop.shuttingDown': 'Lokale Dienste werden beendet...',
    'runtime.migrating': 'Runtime und Web-UI-Versionen werden in das ausgewahlte Speicherverzeichnis verschoben...',
    'runtime.verifyingBundled': 'Die mitgelieferte Laufzeitumgebung wird überprüft...',
    'runtime.extractingBundled': 'Die lokale Laufzeitumgebung wird vorbereitet. Der erste Start kann einen Moment dauern...',
    'runtime.ready': 'Studio Runtime ist bereit.',
    'runtime.localRequired': 'Eine lokale Studio-Laufzeit ist erforderlich. Automatische Downloads sind in Studio deaktiviert.',
    'common.ok': 'OK',
    'common.cancel': 'Cancel',
    'browser.selectElement': 'DOM-Element auswählen',
    'browser.selectRegion': 'Bereich auswählen',
    'loginReset.confirmTitle': 'Reset login',
    'loginReset.confirmMessage': 'Reset the login to admin / 123456?',
    'loginReset.confirmDetail': 'Studio will restart its local Web UI service, clear login locks, and return to the login page.',
    'loginReset.resetting': 'Resetting login...',
    'loginReset.successTitle': 'Login reset',
    'loginReset.successMessage': 'Login has been reset to {username} / {password}.',
    'loginReset.failedTitle': 'Login reset failed',
    'loginReset.failedMessage': 'Could not reset the desktop login.',
  },
  pt: {
    'tray.show': 'Mostrar Studio',
    'tray.hide': 'Ocultar Studio',
    'tray.resetLogin': 'Reset Login',
    'tray.openAtLogin': 'Abrir ao iniciar sessao',
    'tray.openAtLoginFailedTitle': 'Não foi possível alterar a inicialização automática',
    'tray.openAtLoginFailedMessage': 'Não foi possível salvar a configuração. Verifique as permissões de acesso à configuração de inicialização e tente novamente.',
    'tray.quit': 'Sair do Studio',
    'desktop.startingLocalServices': 'Iniciando servicos locais...',
    'desktop.failedPrepareRuntime': 'Falha ao preparar o runtime Studio',
    'desktop.failedStartServices': 'Falha ao iniciar os servicos locais',
    'desktop.shuttingDown': 'Encerrando servicos locais...',
    'runtime.migrating': 'Movendo o Runtime e as versoes Web UI para o diretorio selecionado...',
    'runtime.verifyingBundled': 'Verificando o ambiente de execução incluído...',
    'runtime.extractingBundled': 'Preparando o ambiente de execução local. A primeira inicialização pode levar alguns instantes...',
    'runtime.ready': 'Runtime Studio pronto.',
    'runtime.localRequired': 'É necessário um runtime Studio local. Os downloads automáticos estão desativados no Studio.',
    'common.ok': 'OK',
    'common.cancel': 'Cancel',
    'browser.selectElement': 'Selecionar elemento DOM',
    'browser.selectRegion': 'Selecionar região',
    'loginReset.confirmTitle': 'Reset login',
    'loginReset.confirmMessage': 'Reset the login to admin / 123456?',
    'loginReset.confirmDetail': 'Studio will restart its local Web UI service, clear login locks, and return to the login page.',
    'loginReset.resetting': 'Resetting login...',
    'loginReset.successTitle': 'Login reset',
    'loginReset.successMessage': 'Login has been reset to {username} / {password}.',
    'loginReset.failedTitle': 'Login reset failed',
    'loginReset.failedMessage': 'Could not reset the desktop login.',
  },
}

function resolveLocale(): DesktopLocale {
  const tag = app.getLocale()
  const lower = tag.toLowerCase()
  if (lower.startsWith('zh')) {
    return lower.includes('hant') || lower.includes('-tw') || lower.includes('-hk') || lower.includes('-mo')
      ? 'zh-TW'
      : 'zh'
  }

  const short = tag.slice(0, 2) as DesktopLocale
  return supportedLocales.includes(short) ? short : 'en'
}

export function t(key: TranslationKey, params: Record<string, string> = {}): string {
  const message = translations[resolveLocale()][key] || translations.en[key]
  return Object.entries(params).reduce(
    (value, [name, replacement]) => value.replaceAll(`{${name}}`, replacement),
    message,
  )
}
