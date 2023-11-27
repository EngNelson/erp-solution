import { Controller, Get } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";

@Controller()
export class GetAgentAssignedDeliveryController {

  @Get()
  @ApiProperty({
    type: String
  })
  getAgentAssignedDelivery() {

  }
}