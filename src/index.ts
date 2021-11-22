import { NgModule } from '@angular/core'
import { first, from, merge } from 'rxjs'
import TabbyCoreModule, { AppService, Logger, LogService, SplitTabComponent } from 'tabby-core'
import TabbyTerminalModule, { BaseTerminalTabComponent, XTermFrontend } from 'tabby-terminal'

@NgModule({
    imports: [
        TabbyCoreModule,
        TabbyTerminalModule,
    ],
})
export default class FigModule {
    private logger: Logger
    private activePane: BaseTerminalTabComponent|null = null

    constructor (
        log: LogService,
        app: AppService,
    ) {
        this.logger = log.create('fig')

        app.tabOpened$.subscribe(tab => {
            this.logger.info('New tab opened', tab.title)

            if (tab instanceof BaseTerminalTabComponent) {
                this.attachTo(tab)
            }

            if (tab instanceof SplitTabComponent) {
                tab.initialized$.subscribe(() => {
                    merge(
                        tab.tabAdded$,
                        from(tab.getAllTabs())  // tabAdded$ doesn't fire for tabs restored from saved sessions
                    ).subscribe(pane => {
                        if (pane instanceof BaseTerminalTabComponent) {
                            this.logger.info('New pane opened', pane.title)
                            this.attachTo(pane)
                        }
                    })
                    tab.tabRemoved$.subscribe(pane => {
                        this.logger.info('Pane closed', pane.title)
                    })
                })
            }
        })

        app.tabClosed$.subscribe(tab => {
            this.logger.info('Tab closed', tab.title)
        })
    }


    attachTo (tab: BaseTerminalTabComponent) {
        this.logger.info(`Attached to ${tab.title}`)
        tab.frontendReady$.pipe(first()).subscribe(() => {
            if (tab.frontend! instanceof XTermFrontend) {
                this.logger.info('Got an xterm')
                setTimeout(() => {
                    tab.frontend['xterm'].write('# Hello there!\r')
                }, 1000)
            }
        })

        tab.focused$.subscribe(() => {
            this.activePane = tab
            this.logger.info('Active terminal tab:', tab.title)
        })

        tab.blurred$.subscribe(() => {
            if (this.activePane === tab) {
                this.activePane = null
            }
        })
    }
}
