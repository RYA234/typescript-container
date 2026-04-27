import { Request, Response } from 'express';
import { EvalService } from './service';
import { BatchEvalRequest, EvalQueryRequest } from '../../interfaces/rag-langsmith-ragas';

const service = new EvalService();

export const query = async (req: Request, res: Response): Promise<void> => {
  const { question, evaluate = false } = req.body as EvalQueryRequest;
  if (!question || question.trim() === '') {
    res.status(400).json({ error: 'MISSING_QUESTION', message: 'questionは必須です' });
    return;
  }
  try {
    const result = await service.queryWithEval(question.trim(), Boolean(evaluate));
    res.json(result);
  } catch {
    res.status(502).json({ error: 'QUERY_ERROR', message: 'クエリに失敗しました' });
  }
};

export const batchEval = async (req: Request, res: Response): Promise<void> => {
  const { testSet } = req.body as BatchEvalRequest;
  if (!Array.isArray(testSet) || testSet.length === 0) {
    res.status(400).json({ error: 'INVALID_TEST_SET', message: 'testSetは1件以上必要です' });
    return;
  }
  if (testSet.length > 10) {
    res.status(400).json({ error: 'TOO_MANY_CASES', message: 'testSetは10件以内にしてください' });
    return;
  }
  try {
    const result = await service.batchEval(testSet);
    res.json(result);
  } catch {
    res.status(502).json({ error: 'BATCH_EVAL_ERROR', message: '一括評価に失敗しました' });
  }
};
