import { Component, inject } from '@angular/core';
import { OfflineService } from '../../core/services/offline.service';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  templateUrl: './offline-banner.html',
  styleUrl: './offline-banner.scss',
})
export class OfflineBanner {
  private offlineService = inject(OfflineService);

  readonly offline = this.offlineService.offline;
  readonly pendingCount = this.offlineService.pendingCount;
  readonly syncing = this.offlineService.syncing;

  retry() {
    this.offlineService.retryConnection();
  }
}
