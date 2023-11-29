import { CancelExpeditionService } from "./cancel-expedition/cancel-expedition.service";
import { EditExpeditionService } from "./edit-expedition/edit-expedition.service";
import { GetExpeditionService } from "./get-expeditions/get-expeditions.service";

@Module({
    imports: [],
    controllers: [],
    providers: [CancelExpeditionService, GetExpeditionService, EditExpeditionService]
})
export class ExpeditionsModule { }