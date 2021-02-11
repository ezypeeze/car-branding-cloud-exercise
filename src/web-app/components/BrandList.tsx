import React from "react";
import { Col, Row, Image } from "react-bootstrap";
import { CarBrand } from "../types";

type BrandListProps = {
  items: CarBrand[]
}

export default function BrandList({ items }: BrandListProps) {
  return (
    <Row style={{ borderBottom: '1px solid #000', padding: '15px 0' }}>
      {items.map(item => (
        <>
          <Col className="d-flex justify-content-center align-items-center">
            <h4>{item.name}</h4>
          </Col>
          <Col className="d-flex justify-content-center align-items-center">
            <Image src={item.logoUrl} height="150px" width="150px" />
          </Col>
        </>
      ))}
    </Row>
  )
}