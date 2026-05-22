import { Request, Response } from 'express'
import log from '../utils/logger';

// Services
import CrewService from '../services/CrewService';
import messages from '../config/messages';

export default class CrewController {
  private readonly crewService: CrewService;

  constructor() {
    this.crewService = new CrewService();
  }

  /**
   * Endpoint to retrieve all crew's info
   * @returns Crew details
   */
  getCrews = async (req: Request, res: Response, next: any): Promise<object> => {
    try {
      const { filter } = req.body;
      const crews = await this.crewService.getRecords(filter);

      return res.status(200).json({ data: crews });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Endpoint to retrieve crew's info
   * @returns Crew details
   */
  getCrew = async (req: Request, res: Response, next: any): Promise<object> => {
    try {
      const { filter } = req.body;
      const crew = await this.crewService.getRecord(filter);

      return res.status(200).json({ data: crew });
    } catch (error) {
      return next(error);
    }
  };

   /**
   * Endpoint to register crew
   * @returns Created crew details
   */
  createCrew = async (req: Request, res: Response, next: any): Promise<object> => {
    try {
      const { input } = req.body;
      const createdOrder = await this.crewService.createRecord(input);
      if (!createdOrder) return {};

      log(messages.success.successCreateCrew(
        createdOrder?.crew_id,
        createdOrder?.crew_status,
      ));
      return res.status(200).json({ data: createdOrder });
    } catch (error) {
      return next(error);
    }
  };
}
