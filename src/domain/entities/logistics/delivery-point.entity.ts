import { Column, Entity } from "typeorm";
import { Address } from "../shared";
import { DbBaseEntity } from "@glosuite/shared";

@Entity("delivery-points")
export class DeliveryPoint extends DbBaseEntity{
@Column({type:"simple-json", nullable:false})
deliveryPointAddress:Address
// @TODO - Still to add remaining columns
}