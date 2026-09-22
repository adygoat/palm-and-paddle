import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class CourtsService {
  private readonly courts = [
    {
      id: 'court-1',
      name: 'Court 1',
      active: true,
    },
    {
      id: 'court-2',
      name: 'Court 2',
      active: true,
    },
  ];

  findAll() {
    return this.courts;
  }

  findOne(id: string) {
    const court = this.courts.find((court) => court.id === id);

    if (!court) {
      throw new NotFoundException('Court not found');
    }

    return court;
  }
}